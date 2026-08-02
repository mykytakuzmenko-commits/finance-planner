import type { Account, Category, Transaction } from '../types/finance'

/**
 * Read-only offline snapshot of the user's core data.
 *
 * Written after every successful authenticated load; read back only when the
 * network fetch fails (offline) so the app can still show the last-known
 * balance, operations and accounts instead of a misleading empty state.
 * Keyed per user so a shared browser never shows another account's data.
 */
export interface DataSnapshot {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
}

const keyFor = (userId: string) => `pfp.snapshot.v1.${userId}`

export function saveSnapshot(userId: string | null, snap: DataSnapshot): void {
  if (!userId) return
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(snap))
  } catch {
    /* quota / private mode — offline cache is best-effort */
  }
}

export function loadSnapshot(userId: string | null): DataSnapshot | null {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(keyFor(userId))
    return raw ? (JSON.parse(raw) as DataSnapshot) : null
  } catch {
    return null
  }
}
