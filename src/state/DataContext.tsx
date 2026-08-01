import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Account, Category, Transaction } from '../types/finance'
import {
  STORES,
  bulkDelete,
  bulkPut,
  deleteRecord,
  getAll,
  putRecord,
} from '../db/database'
import { buildDefaultCategories } from '../services/seed'
import { createId } from '../utils/id'
import {
  computeAccountBalances,
  sumByType,
  totalBalance,
} from '../calculations/balances'

interface DataContextValue {
  loading: boolean
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]

  // Derived
  balances: Map<string, number>
  totalBalance: number
  totalIncome: number
  totalExpense: number

  // Accounts
  addAccount: (input: Omit<Account, 'id' | 'createdAt'>) => Promise<void>
  updateAccount: (account: Account) => Promise<void>
  deleteAccount: (id: string) => Promise<void>

  // Categories
  addCategory: (input: Omit<Category, 'id' | 'createdAt'>) => Promise<void>
  updateCategory: (category: Category) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Transactions
  addTransaction: (input: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (transaction: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  /** Link (or, with undefined, unlink) a transaction to a planned item. */
  linkTransaction: (txId: string, planItemId: string | undefined) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

/**
 * Guarded first-run seeding. React StrictMode mounts the provider effect twice
 * in dev, and multiple tabs can race too — without this guard both runs read an
 * empty store and each seed, producing duplicate categories. A shared module-level
 * promise ensures the seed happens exactly once.
 */
let seedPromise: Promise<Category[]> | null = null
async function ensureCategories(): Promise<Category[]> {
  const existing = await getAll<Category>(STORES.categories)
  if (existing.length > 0) return existing
  if (!seedPromise) {
    seedPromise = (async () => {
      const recheck = await getAll<Category>(STORES.categories)
      if (recheck.length > 0) return recheck
      const seeded = buildDefaultCategories()
      await bulkPut(STORES.categories, seeded)
      return seeded
    })()
  }
  return seedPromise
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [acc, categoryList, txs] = await Promise.all([
          getAll<Account>(STORES.accounts),
          ensureCategories(),
          getAll<Transaction>(STORES.transactions),
        ])
        if (cancelled) return
        // Keep a stable, predictable order (IndexedDB returns by key, not by insertion).
        setAccounts([...acc].sort((a, b) => a.createdAt - b.createdAt))
        setCategories([...categoryList].sort((a, b) => a.createdAt - b.createdAt))
        setTransactions(txs)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Accounts ----
  const addAccount = useCallback(
    async (input: Omit<Account, 'id' | 'createdAt'>) => {
      const account: Account = { ...input, id: createId(), createdAt: Date.now() }
      await putRecord(STORES.accounts, account)
      setAccounts((prev) => [...prev, account])
    },
    [],
  )

  const updateAccount = useCallback(async (account: Account) => {
    await putRecord(STORES.accounts, account)
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)))
  }, [])

  const deleteAccount = useCallback(
    async (id: string) => {
      // Cascade: remove every transaction that touches this account.
      const related = transactions.filter(
        (t) =>
          t.accountId === id ||
          t.fromAccountId === id ||
          t.toAccountId === id,
      )
      await bulkDelete(
        STORES.transactions,
        related.map((t) => t.id),
      )
      await deleteRecord(STORES.accounts, id)
      const relatedIds = new Set(related.map((t) => t.id))
      setTransactions((prev) => prev.filter((t) => !relatedIds.has(t.id)))
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    },
    [transactions],
  )

  // ---- Categories ----
  const addCategory = useCallback(
    async (input: Omit<Category, 'id' | 'createdAt'>) => {
      const category: Category = {
        ...input,
        id: createId(),
        createdAt: Date.now(),
      }
      await putRecord(STORES.categories, category)
      setCategories((prev) => [...prev, category])
    },
    [],
  )

  const updateCategory = useCallback(async (category: Category) => {
    await putRecord(STORES.categories, category)
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? category : c)),
    )
  }, [])

  const deleteCategory = useCallback(
    async (id: string) => {
      // Keep transactions but detach the category (they become uncategorized).
      const affected = transactions
        .filter((t) => t.categoryId === id)
        .map((t) => ({ ...t, categoryId: undefined }))
      await bulkPut(STORES.transactions, affected)
      await deleteRecord(STORES.categories, id)
      const affectedIds = new Set(affected.map((t) => t.id))
      setTransactions((prev) =>
        prev.map((t) => (affectedIds.has(t.id) ? { ...t, categoryId: undefined } : t)),
      )
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    [transactions],
  )

  // ---- Transactions ----
  const addTransaction = useCallback(
    async (input: Omit<Transaction, 'id' | 'createdAt'>) => {
      const transaction: Transaction = {
        ...input,
        id: createId(),
        createdAt: Date.now(),
      }
      await putRecord(STORES.transactions, transaction)
      setTransactions((prev) => [...prev, transaction])
    },
    [],
  )

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    await putRecord(STORES.transactions, transaction)
    setTransactions((prev) =>
      prev.map((t) => (t.id === transaction.id ? transaction : t)),
    )
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteRecord(STORES.transactions, id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const linkTransaction = useCallback(
    async (txId: string, planItemId: string | undefined) => {
      setTransactions((prev) => {
        const tx = prev.find((t) => t.id === txId)
        if (!tx) return prev
        const updated = { ...tx, planItemId }
        void putRecord(STORES.transactions, updated)
        return prev.map((t) => (t.id === txId ? updated : t))
      })
    },
    [],
  )

  // ---- Derived ----
  const balances = useMemo(
    () => computeAccountBalances(accounts, transactions),
    [accounts, transactions],
  )
  const derivedTotalBalance = useMemo(() => totalBalance(balances), [balances])
  const totalIncome = useMemo(
    () => sumByType(transactions, 'income'),
    [transactions],
  )
  const totalExpense = useMemo(
    () => sumByType(transactions, 'expense'),
    [transactions],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      accounts,
      categories,
      transactions,
      balances,
      totalBalance: derivedTotalBalance,
      totalIncome,
      totalExpense,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      linkTransaction,
    }),
    [
      loading,
      accounts,
      categories,
      transactions,
      balances,
      derivedTotalBalance,
      totalIncome,
      totalExpense,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      linkTransaction,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
