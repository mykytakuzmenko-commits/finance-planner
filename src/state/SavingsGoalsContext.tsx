import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SavingsGoal } from '../types/savings'
import { STORES, deleteRecord, getAll, putRecord } from '../db/database'
import { createId } from '../utils/id'

interface SavingsGoalsContextValue {
  loading: boolean
  goals: SavingsGoal[]
  addGoal: (input: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<void>
  updateGoal: (goal: SavingsGoal) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
}

const SavingsGoalsContext = createContext<SavingsGoalsContextValue | null>(null)

export function SavingsGoalsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<SavingsGoal[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getAll<SavingsGoal>(STORES.savingsGoals)
        if (!cancelled) setGoals(list.sort((a, b) => a.createdAt - b.createdAt))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addGoal = useCallback(async (input: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const goal: SavingsGoal = { ...input, id: createId(), createdAt: Date.now() }
    await putRecord(STORES.savingsGoals, goal)
    setGoals((prev) => [...prev, goal])
  }, [])

  const updateGoal = useCallback(async (goal: SavingsGoal) => {
    await putRecord(STORES.savingsGoals, goal)
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)))
  }, [])

  const deleteGoal = useCallback(async (id: string) => {
    await deleteRecord(STORES.savingsGoals, id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const value = useMemo<SavingsGoalsContextValue>(
    () => ({ loading, goals, addGoal, updateGoal, deleteGoal }),
    [loading, goals, addGoal, updateGoal, deleteGoal],
  )

  return (
    <SavingsGoalsContext.Provider value={value}>{children}</SavingsGoalsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSavingsGoals(): SavingsGoalsContextValue {
  const ctx = useContext(SavingsGoalsContext)
  if (!ctx) throw new Error('useSavingsGoals must be used within a SavingsGoalsProvider')
  return ctx
}
