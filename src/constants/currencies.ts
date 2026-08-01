import type { CurrencyCode } from '../types/settings'

export interface CurrencyInfo {
  code: CurrencyCode
  symbol: string
  label: string
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'UAH', symbol: '₴', label: 'Гривня' },
  { code: 'USD', symbol: '$', label: 'Долар США' },
  { code: 'EUR', symbol: '€', label: 'Євро' },
]

export function getCurrency(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}
