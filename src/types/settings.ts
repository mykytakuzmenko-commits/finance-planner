export type CurrencyCode = 'UAH' | 'USD' | 'EUR'

export interface UserSettings {
  /** Whether the user has completed the onboarding flow. */
  onboarded: boolean
  /** Optional display name entered during onboarding. */
  name: string
  /** Main currency used across the app. */
  baseCurrency: CurrencyCode
  /** Bumped when the settings shape changes, for future migrations. */
  schemaVersion: number
}

export const SETTINGS_SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: UserSettings = {
  onboarded: false,
  name: '',
  baseCurrency: 'UAH',
  schemaVersion: SETTINGS_SCHEMA_VERSION,
}
