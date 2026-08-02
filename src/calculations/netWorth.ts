import type { Account, Transaction } from '../types/finance'
import { toBase, type ExchangeRates } from '../utils/rates'
import { addMonths } from '../utils/month'

export interface NetWorth {
  current: number // base minor units, all accounts
  liquid: number // non-savings accounts
  savings: number // savings accounts
  changeAmount: number // vs the end of the previous month
  changePct: number | null
  trend: number[] // net worth at each month-end over the window (base minor)
}

/**
 * Net worth = everything across the user's accounts, in the base currency.
 * There are no liability accounts, so an account with a negative balance
 * (e.g. an overdraft) simply subtracts. The trend replays every transaction
 * up to each month-end so the history is derived, never stored.
 */
export function buildNetWorth(
  accounts: Account[],
  balances: Map<string, number>,
  transactions: Transaction[],
  rates: ExchangeRates,
  asOfMonth: string,
  monthsBack = 6,
): NetWorth {
  const curOf = new Map(accounts.map((a) => [a.id, a.currency]))
  const cur = (id?: string) => curOf.get(id ?? '')

  const inBase = (id: string | undefined, amount: number) => {
    const c = cur(id)
    return c ? toBase(amount, c, rates) : 0
  }

  const current = accounts.reduce((s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates), 0)
  const liquid = accounts
    .filter((a) => !a.isSavings)
    .reduce((s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates), 0)
  const savings = current - liquid

  // Per-month net effect on total worth (base minor units).
  const effect = new Map<string, number>()
  const initialTotal = accounts.reduce((s, a) => s + toBase(a.initialBalance, a.currency, rates), 0)
  for (const t of transactions) {
    const m = t.date.slice(0, 7)
    let e = 0
    if (t.type === 'income') e = inBase(t.accountId, t.amount)
    else if (t.type === 'expense') e = -inBase(t.accountId, t.amount)
    else if (t.type === 'transfer')
      e = -inBase(t.fromAccountId, t.amount) + inBase(t.toAccountId, t.toAmount ?? t.amount)
    effect.set(m, (effect.get(m) ?? 0) + e)
  }

  const startWindow = addMonths(asOfMonth, -(monthsBack - 1))
  // Fold everything before the window into the running baseline.
  let running = initialTotal
  for (const [m, e] of effect) if (m < startWindow) running += e

  const trend: number[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const m = addMonths(asOfMonth, -i)
    running += effect.get(m) ?? 0
    trend.push(running)
  }
  // Keep the headline and the sparkline's end point consistent.
  trend[trend.length - 1] = current

  const prev = trend.length >= 2 ? trend[trend.length - 2] : initialTotal
  const changeAmount = current - prev
  const changePct = prev !== 0 ? (changeAmount / Math.abs(prev)) * 100 : null

  return { current, liquid, savings, changeAmount, changePct, trend }
}
