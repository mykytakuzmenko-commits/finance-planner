import type { CurrencyCode } from '../types/settings'

/**
 * Rough default UAH value of one unit of each currency. These are just editable
 * placeholders for manual rates; Milestone 8 replaces them with live rates.
 */
const UAH_VALUE: Record<CurrencyCode, number> = {
  UAH: 1,
  USD: 41,
  EUR: 45,
}

export type ExchangeRates = Record<CurrencyCode, number>

/** Default rates expressed as base-currency units per 1 unit of each currency. */
export function defaultRates(base: CurrencyCode): ExchangeRates {
  const b = UAH_VALUE[base]
  return {
    UAH: UAH_VALUE.UAH / b,
    USD: UAH_VALUE.USD / b,
    EUR: UAH_VALUE.EUR / b,
  }
}

/** Convert a minor-unit amount from `currency` into base currency (rounded). */
export function toBase(
  amount: number,
  currency: CurrencyCode,
  rates: ExchangeRates,
): number {
  return Math.round(amount * (rates[currency] ?? 1))
}

/** Convert a minor-unit amount between two currencies via base. */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates,
): number {
  const inBase = amount * (rates[from] ?? 1)
  return Math.round(inBase / (rates[to] ?? 1))
}
