import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  type UserSettings,
} from '../types/settings'
import { supabase } from '../config/supabase'
import { useAuth } from './AuthContext'

interface SettingsContextValue {
  loading: boolean
  settings: UserSettings
  updateSettings: (patch: Partial<UserSettings>) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

interface ProfileRow {
  name: string | null
  base_currency: string
  exchange_rates: UserSettings['exchangeRates']
  emergency_target_months: number
  onboarded: boolean
}

function rowToSettings(row: ProfileRow): UserSettings {
  return {
    onboarded: row.onboarded,
    name: row.name ?? '',
    baseCurrency: row.base_currency as UserSettings['baseCurrency'],
    exchangeRates: row.exchange_rates,
    emergencyTargetMonths: row.emergency_target_months,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
  }
}

function settingsToRow(s: UserSettings): ProfileRow {
  return {
    name: s.name,
    base_currency: s.baseCurrency,
    exchange_rates: s.exchangeRates,
    emergency_target_months: s.emergencyTargetMonths,
    onboarded: s.onboarded,
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!userId) return
      const { data } = await supabase
        .from('profiles')
        .select('name, base_currency, exchange_rates, emergency_target_months, onboarded')
        .eq('id', userId)
        .maybeSingle()
      if (cancelled) return
      if (data) setSettings(rowToSettings(data as ProfileRow))
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const persist = useCallback(
    (next: UserSettings) => {
      if (!userId) return
      void supabase.from('profiles').update(settingsToRow(next)).eq('id', userId)
    },
    [userId],
  )

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const resetSettings = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS }
    setSettings(next)
    persist(next)
  }, [persist])

  const value = useMemo(
    () => ({ loading, settings, updateSettings, resetSettings }),
    [loading, settings, updateSettings, resetSettings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
