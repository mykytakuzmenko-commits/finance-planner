import { supabase } from '../config/supabase'

// Cloud data layer (Supabase). Keeps the same function names the app already
// used for IndexedDB, so the feature contexts stay almost unchanged. Every row
// is scoped to the signed-in user via `user_id` + Row Level Security.

export const STORES = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  planTemplates: 'plan_templates',
  planItems: 'plan_items',
  planMonths: 'plan_months',
  weeklyBudgets: 'weekly_budgets',
  savingsGoals: 'savings_goals',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

// The signed-in user id, set by the auth layer. Writes attach it; RLS enforces it.
let currentUserId: string | null = null
export function setCurrentUserId(id: string | null): void {
  currentUserId = id
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

/** Client object → DB row (camelCase keys → snake_case; drop undefined). */
function toRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) continue
    out[snake(k)] = obj[k]
  }
  if (currentUserId) out.user_id = currentUserId
  return out
}

/** DB row → client object (snake_case → camelCase; drop nulls & user_id). */
function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    if (k === 'user_id' || row[k] === null) continue
    out[camel(k)] = row[k]
  }
  return out as T
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const { data, error } = await supabase.from(store).select('*')
  if (error) throw error
  return (data ?? []).map((r) => fromRow<T>(r as Record<string, unknown>))
}

export async function putRecord<T extends object>(store: StoreName, value: T): Promise<T> {
  const row = toRow(value as Record<string, unknown>)
  const options = store === STORES.planMonths ? { onConflict: 'user_id,month' } : undefined
  const { error } = await supabase.from(store).upsert(row, options)
  if (error) throw error
  return value
}

export async function bulkPut<T extends object>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return
  const rows = values.map((v) => toRow(v as Record<string, unknown>))
  const options = store === STORES.planMonths ? { onConflict: 'user_id,month' } : undefined
  const { error } = await supabase.from(store).upsert(rows, options)
  if (error) throw error
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  const { error } = await supabase.from(store).delete().eq('id', id)
  if (error) throw error
}

export async function bulkDelete(store: StoreName, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from(store).delete().in('id', ids)
  if (error) throw error
}

export async function clearStore(store: StoreName): Promise<void> {
  if (!currentUserId) return
  const { error } = await supabase.from(store).delete().eq('user_id', currentUserId)
  if (error) throw error
}
