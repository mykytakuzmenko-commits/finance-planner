// Serverless API layer (Vercel function). Fetches macro-economic data from the
// National Bank of Ukraine and returns it with source, date and freshness.
// No personal data is ever received or sent here — only public macro data.

interface RatesMetric {
  USD: number
  EUR: number
  date: string
  source: string
  live: boolean
}
interface KeyRateMetric {
  value: number
  date: string
  source: string
  live: boolean
}
interface InflationMetric {
  value: number
  period: string
  date: string
  source: string
  live: boolean
}

const NBU = 'Національний банк України (bank.gov.ua)'

// Last-known values, used as a fallback when a live source is unavailable.
const FALLBACK = {
  rates: { USD: 41.5, EUR: 45.0, date: '2026-08-01' },
  keyRate: { value: 13.5, date: '2026-07-25' },
  inflation: { value: 8.5, period: 'річна, р/р', date: '2026-07-01' },
}

async function fetchJson(url: string, ms = 5000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

/** "05.08.2026" → "2026-08-05" */
function fromNbuDate(s: string): string {
  const [d, m, y] = s.split('.')
  return `${y}-${m}-${d}`
}
/** 20260805 → "2026-08-05" */
function fromYyyymmdd(n: number): string {
  const s = String(n)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(_req: any, res: any) {
  let rates: RatesMetric = { ...FALLBACK.rates, source: NBU, live: false }
  let keyRate: KeyRateMetric = { ...FALLBACK.keyRate, source: NBU, live: false }
  const inflation: InflationMetric = {
    ...FALLBACK.inflation,
    source: 'НБУ / Держстат (останні відомі)',
    live: false,
  }

  try {
    const ex = (await fetchJson(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json',
    )) as Array<{ cc: string; rate: number; exchangedate: string }>
    const usd = ex.find((x) => x.cc === 'USD')
    const eur = ex.find((x) => x.cc === 'EUR')
    if (usd && eur) {
      rates = {
        USD: usd.rate,
        EUR: eur.rate,
        date: fromNbuDate(usd.exchangedate),
        source: NBU,
        live: true,
      }
    }
  } catch {
    // keep fallback rates
  }

  try {
    const kr = (await fetchJson(
      'https://bank.gov.ua/NBUStatService/v1/statdirectory/keyrate?json',
    )) as Array<Record<string, unknown>>
    if (Array.isArray(kr) && kr.length) {
      const last = kr[kr.length - 1]
      const val = Number(last.key_rate ?? last.keyrate ?? last.rate)
      if (Number.isFinite(val)) {
        const date =
          typeof last.date === 'string' && last.date.includes('.')
            ? fromNbuDate(last.date)
            : typeof last.yyyymmdd === 'number'
              ? fromYyyymmdd(last.yyyymmdd)
              : FALLBACK.keyRate.date
        keyRate = { value: val, date, source: NBU, live: true }
      }
    }
  } catch {
    // keep fallback key rate
  }

  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).json({ rates, keyRate, inflation, fetchedAt: new Date().toISOString() })
}
