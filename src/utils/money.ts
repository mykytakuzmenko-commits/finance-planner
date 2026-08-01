import type { CurrencyCode } from '../types/settings'

/**
 * Parse a user-entered amount string into integer minor units.
 * Accepts both "," and "." as decimal separator and ignores spaces.
 * Returns null when the input is not a valid positive number.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  if (!/^\d*\.?\d*$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

/** Format minor units as a plain decimal string for editing, e.g. 123456 -> "1234.56". */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2)
}

/** Format minor units as a localized currency string, e.g. "1 234,56 ₴". */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  const value = minor / 100
  try {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

/** Signed format with an explicit +/− prefix (used for transaction rows). */
export function formatSigned(minor: number, currency: CurrencyCode, sign: '+' | '-'): string {
  return `${sign}${formatMoney(Math.abs(minor), currency)}`
}
