export type CurrencyCode = 'UAH' | 'USD' | 'EUR'

export interface UserSettings {
  /** Whether the user has completed the onboarding flow. */
  onboarded: boolean
  /** Optional display name entered during onboarding. */
  name: string
  /** Main currency used across the app. */
  baseCurrency: CurrencyCode
  /** Manual exchange rates: base-currency units per 1 unit of each currency. */
  exchangeRates: Record<CurrencyCode, number>
  /** Emergency-fund target expressed in months of expenses. */
  emergencyTargetMonths: number
  /** Bumped when the settings shape changes, for future migrations. */
  schemaVersion: number
}

export const SETTINGS_SCHEMA_VERSION = 2

export const DEFAULT_SETTINGS: UserSettings = {
  onboarded: false,
  name: '',
  baseCurrency: 'UAH',
  exchangeRates: { UAH: 1, USD: 41, EUR: 45 },
  emergencyTargetMonths: 3,
  schemaVersion: SETTINGS_SCHEMA_VERSION,
}
