import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMacro, type MacroData } from '../services/macro'

interface MacroContextValue {
  loading: boolean
  data: MacroData | null
  fromCache: boolean
  refresh: () => Promise<void>
}

const MacroContext = createContext<MacroContextValue | null>(null)

export function MacroProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MacroData | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const load = useCallback(async (force: boolean) => {
    setLoading(true)
    try {
      const res = await fetchMacro(force)
      setData(res.data)
      setFromCache(res.fromCache)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const refresh = useCallback(() => load(true), [load])

  const value = useMemo<MacroContextValue>(
    () => ({ loading, data, fromCache, refresh }),
    [loading, data, fromCache, refresh],
  )

  return <MacroContext.Provider value={value}>{children}</MacroContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMacro(): MacroContextValue {
  const ctx = useContext(MacroContext)
  if (!ctx) throw new Error('useMacro must be used within a MacroProvider')
  return ctx
}
