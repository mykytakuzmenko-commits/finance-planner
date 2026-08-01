import type { Account, Transaction } from '../types/finance'

/**
 * Account balances are always DERIVED from the initial balance plus the effect
 * of every transaction. Nothing is stored, so editing or deleting a transaction
 * automatically produces a correct recalculation.
 */
export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[],
): Map<string, number> {
  const balances = new Map<string, number>()
  for (const a of accounts) balances.set(a.id, a.initialBalance)

  const add = (id: string | undefined, delta: number) => {
    if (!id || !balances.has(id)) return
    balances.set(id, (balances.get(id) ?? 0) + delta)
  }

  for (const t of transactions) {
    if (t.type === 'income') {
      add(t.accountId, t.amount)
    } else if (t.type === 'expense') {
      add(t.accountId, -t.amount)
    } else if (t.type === 'transfer') {
      add(t.fromAccountId, -t.amount)
      // Destination is credited toAmount for cross-currency transfers, else amount.
      add(t.toAccountId, t.toAmount ?? t.amount)
    }
  }
  return balances
}

export function sumByType(
  transactions: Transaction[],
  type: 'income' | 'expense',
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((acc, t) => acc + t.amount, 0)
}

export function totalBalance(balances: Map<string, number>): number {
  let total = 0
  for (const v of balances.values()) total += v
  return total
}
