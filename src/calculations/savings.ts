import type { Account } from '../types/finance'
import type { SavingsGoal } from '../types/savings'
import type { CurrencyCode } from '../types/settings'
import { toBase, type ExchangeRates } from '../utils/rates'

export interface CurrencyAllocation {
  currency: CurrencyCode
  amount: number // in that currency
  baseAmount: number // converted to base
  pct: number // share of total, in base
}

export interface GoalProgress {
  goal: SavingsGoal
  pct: number
  remaining: number
}

export interface SavingsSummary {
  totalBase: number
  savingsBase: number
  allocation: CurrencyAllocation[]
  emergencyFundBase: number
  monthlyExpense: number
  coverageMonths: number
  targetMonths: number
  coveragePct: number
  goals: GoalProgress[]
}

export function buildSavingsSummary(
  accounts: Account[],
  balances: Map<string, number>,
  rates: ExchangeRates,
  targetMonths: number,
  monthlyExpense: number,
  goals: SavingsGoal[],
): SavingsSummary {
  const byCurrency = new Map<CurrencyCode, number>()
  for (const a of accounts) {
    byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + (balances.get(a.id) ?? 0))
  }

  let totalBase = 0
  const allocation: CurrencyAllocation[] = []
  for (const [currency, amount] of byCurrency) {
    const baseAmount = toBase(amount, currency, rates)
    totalBase += baseAmount
    allocation.push({ currency, amount, baseAmount, pct: 0 })
  }
  for (const a of allocation) {
    a.pct = totalBase > 0 ? (a.baseAmount / totalBase) * 100 : 0
  }
  allocation.sort((x, y) => y.baseAmount - x.baseAmount)

  const savingsBase = accounts
    .filter((a) => a.isSavings)
    .reduce((s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates), 0)

  const emergencyFundBase = savingsBase
  const coverageMonths = monthlyExpense > 0 ? emergencyFundBase / monthlyExpense : 0
  const coveragePct = targetMonths > 0 ? Math.min(100, (coverageMonths / targetMonths) * 100) : 0

  const goalProgress: GoalProgress[] = goals.map((g) => ({
    goal: g,
    pct: g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0,
    remaining: Math.max(0, g.target - g.saved),
  }))

  return {
    totalBase,
    savingsBase,
    allocation,
    emergencyFundBase,
    monthlyExpense,
    coverageMonths,
    targetMonths,
    coveragePct,
    goals: goalProgress,
  }
}
