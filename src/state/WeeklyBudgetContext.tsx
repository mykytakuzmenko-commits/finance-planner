import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { WeeklyBudget, WeeklyLimit } from '../types/weekly'
import { STORES, getAll, putRecord } from '../db/database'
import { createId } from '../utils/id'

interface WeeklyBudgetContextValue {
  loading: boolean
  budgets: WeeklyBudget[]
  getBudget: (weekStart: string) => WeeklyBudget | undefined
  /** Add a new category limit, or update the existing one for that category. */
  setLimit: (weekStart: string, categoryId: string, limit: number) => Promise<void>
  deleteLimit: (weekStart: string, limitId: string) => Promise<void>
}

const WeeklyBudgetContext = createContext<WeeklyBudgetContextValue | null>(null)

export function WeeklyBudgetProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<WeeklyBudget[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getAll<WeeklyBudget>(STORES.weeklyBudgets)
        if (!cancelled) setBudgets(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setLimit = useCallback(
    async (weekStart: string, categoryId: string, limit: number) => {
      setBudgets((prev) => {
        const existing = prev.find((b) => b.weekStart === weekStart)
        const budget: WeeklyBudget = existing
          ? { ...existing, limits: [...existing.limits] }
          : { id: createId(), weekStart, limits: [], createdAt: Date.now() }

        const li = budget.limits.findIndex((l) => l.categoryId === categoryId)
        if (li === -1) {
          const line: WeeklyLimit = { id: createId(), categoryId, limit }
          budget.limits = [...budget.limits, line]
        } else {
          budget.limits[li] = { ...budget.limits[li], limit }
        }

        void putRecord(STORES.weeklyBudgets, budget)
        if (existing) return prev.map((b) => (b.id === budget.id ? budget : b))
        return [...prev, budget]
      })
    },
    [],
  )

  const deleteLimit = useCallback(
    async (weekStart: string, limitId: string) => {
      setBudgets((prev) => {
        const existing = prev.find((b) => b.weekStart === weekStart)
        if (!existing) return prev
        const budget: WeeklyBudget = {
          ...existing,
          limits: existing.limits.filter((l) => l.id !== limitId),
        }
        void putRecord(STORES.weeklyBudgets, budget)
        return prev.map((b) => (b.id === budget.id ? budget : b))
      })
    },
    [],
  )

  const getBudget = useCallback(
    (weekStart: string) => budgets.find((b) => b.weekStart === weekStart),
    [budgets],
  )

  const value = useMemo<WeeklyBudgetContextValue>(
    () => ({ loading, budgets, getBudget, setLimit, deleteLimit }),
    [loading, budgets, getBudget, setLimit, deleteLimit],
  )

  return (
    <WeeklyBudgetContext.Provider value={value}>
      {children}
    </WeeklyBudgetContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWeeklyBudget(): WeeklyBudgetContextValue {
  const ctx = useContext(WeeklyBudgetContext)
  if (!ctx) throw new Error('useWeeklyBudget must be used within a WeeklyBudgetProvider')
  return ctx
}
