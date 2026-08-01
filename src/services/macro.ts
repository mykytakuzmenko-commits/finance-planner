import type { CurrencyCode } from '../types/settings'
import type { ExchangeRates } from '../utils/rates'

export interface MacroData {
  rates: { USD: number; EUR: number; date: string; source: string; live: boolean }
  keyRate: { value: number; date: string; source: string; live: boolean }
  inflation: { value: number; period: string; date: string; source: string; live: boolean }
  fetchedAt: string
}

const CACHE_KEY = 'pfp.macro.v1'
// Serve cached data without re-fetching for this long.
const FRESH_MS = 60 * 60 * 1000

const BUNDLED: MacroData = {
  rates: { USD: 41.5, EUR: 45.0, date: '2026-08-01', source: 'НБУ (останні відомі)', live: false },
  keyRate: { value: 13.5, date: '2026-07-25', source: 'НБУ (останні відомі)', live: false },
  inflation: {
    value: 8.5,
    period: 'річна, р/р',
    date: '2026-07-01',
    source: 'НБУ / Держстат (останні відомі)',
    live: false,
  },
  fetchedAt: '2026-08-01T00:00:00.000Z',
}

function loadCache(): MacroData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as MacroData) : null
  } catch {
    return null
  }
}

export interface MacroResult {
  data: MacroData
  /** True when served from cache/fallback rather than a fresh network response. */
  fromCache: boolean
}

/**
 * Fetch macro data through the API layer, caching the result. On failure, fall
 * back to the last cached response, then to bundled last-known values.
 */
export async function fetchMacro(force = false): Promise<MacroResult> {
  const cached = loadCache()
  if (!force && cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime()
    if (Number.isFinite(age) && age >= 0 && age < FRESH_MS) {
      return { data: cached, fromCache: true }
    }
  }
  try {
    const r = await fetch('/api/macro')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = (await r.json()) as MacroData
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {
      /* ignore quota */
    }
    return { data, fromCache: false }
  } catch {
    return { data: cached ?? BUNDLED, fromCache: true }
  }
}

/** Derive base-per-unit exchange rates from NBU UAH-denominated rates. */
export function ratesFromMacro(data: MacroData, base: CurrencyCode): ExchangeRates {
  const uahPer: Record<CurrencyCode, number> = {
    UAH: 1,
    USD: data.rates.USD,
    EUR: data.rates.EUR,
  }
  const b = uahPer[base]
  return {
    UAH: uahPer.UAH / b,
    USD: uahPer.USD / b,
    EUR: uahPer.EUR / b,
  }
}
