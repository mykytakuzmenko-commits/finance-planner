import type { CurrencyCode } from './settings'

export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'

export interface Account {
  id: string
  name: string
  /** Opening balance in minor units (e.g. kopiykas/cents). */
  initialBalance: number
  currency: CurrencyCode
  /** Marks the account as savings (counts toward savings & emergency fund). */
  isSavings?: boolean
  createdAt: number
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  createdAt: number
}

export interface Transaction {
  id: string
  type: TransactionType
  /** Positive amount in minor units. */
  amount: number
  /** ISO date, YYYY-MM-DD. */
  date: string
  note?: string
  /** income → destination account; expense → source account. */
  accountId?: string
  categoryId?: string
  /** transfer only */
  fromAccountId?: string
  toAccountId?: string
  /** Transfer only: amount credited to the destination in its currency (for conversions). */
  toAmount?: number
  /** Linked planned item (plan-fact). Multiple transactions may share one. */
  planItemId?: string
  createdAt: number
}
