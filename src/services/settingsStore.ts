import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  type UserSettings,
} from '../types/settings'
import { defaultRates } from '../utils/rates'

const STORAGE_KEY = 'pfp.settings.v1'

/** Load settings from localStorage, merging with defaults for forward-compat. */
export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    const merged: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      schemaVersion: SETTINGS_SCHEMA_VERSION,
    }
    // Seed exchange rates from the base currency the first time they are missing.
    if (!parsed.exchangeRates) {
      merged.exchangeRates = defaultRates(merged.baseCurrency)
    }
    return merged
  } catch {
    // Corrupted value — fall back to defaults rather than crashing.
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private mode / quota) — ignore silently for now.
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
