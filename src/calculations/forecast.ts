import type { Transaction } from '../types/finance'
import type { PlanItem } from '../types/planning'

export interface DashboardForecast {
  currentBalance: number

  actualIncome: number
  actualExpense: number

  plannedIncomeFull: number
  plannedIncomeWeighted: number
  plannedIncomeGuaranteed: number
  plannedExpense: number

  upcomingIncomeGuaranteed: number
  upcomingIncomeWeighted: number
  upcomingIncomeOptimistic: number
  upcomingExpense: number

  /** Projected end-of-month balance under each income assumption. */
  guaranteedForecast: number
  weightedForecast: number
  optimisticForecast: number

  plannedSavings: number
  actualSavings: number

  /** How much can still be spent freely while keeping the guaranteed plan on track. */
  safeToSpend: number
  /** Shortfall (> 0) when even the guaranteed forecast is negative. */
  deficit: number
}

function isCertain(item: PlanItem): boolean {
  return item.probability === undefined || item.probability >= 100
}

function weight(item: PlanItem): number {
  if (item.probability === undefined) return 1
  return Math.max(0, Math.min(100, item.probability)) / 100
}

/**
 * Build the current-month forecast. "Upcoming" amounts are what remains of the
 * plan after subtracting month-to-date actuals, which avoids double-counting
 * income that has already been received (it is already in the current balance).
 */
export function buildForecast(
  currentBalance: number,
  monthTransactions: Transaction[],
  planItems: PlanItem[],
): DashboardForecast {
  const sum = (arr: { amount: number }[]) => arr.reduce((a, x) => a + x.amount, 0)

  const actualIncome = sum(monthTransactions.filter((t) => t.type === 'income'))
  const actualExpense = sum(monthTransactions.filter((t) => t.type === 'expense'))

  const incomeItems = planItems.filter((i) => i.kind === 'income')
  const expenseItems = planItems.filter((i) => i.kind === 'expense')

  const plannedIncomeFull = sum(incomeItems)
  const plannedIncomeWeighted = incomeItems.reduce(
    (a, i) => a + Math.round(i.amount * weight(i)),
    0,
  )
  const plannedIncomeGuaranteed = sum(incomeItems.filter(isCertain))
  const plannedExpense = sum(expenseItems)

  const rem = (planned: number, actual: number) => Math.max(0, planned - actual)
  const upcomingIncomeGuaranteed = rem(plannedIncomeGuaranteed, actualIncome)
  const upcomingIncomeWeighted = rem(plannedIncomeWeighted, actualIncome)
  const upcomingIncomeOptimistic = rem(plannedIncomeFull, actualIncome)
  const upcomingExpense = rem(plannedExpense, actualExpense)

  const guaranteedForecast = currentBalance + upcomingIncomeGuaranteed - upcomingExpense
  const weightedForecast = currentBalance + upcomingIncomeWeighted - upcomingExpense
  const optimisticForecast = currentBalance + upcomingIncomeOptimistic - upcomingExpense

  const plannedSavings = plannedIncomeFull - plannedExpense
  const actualSavings = actualIncome - actualExpense

  // Keep the guaranteed savings target aside; the rest is safe to spend.
  const savingsTarget = Math.max(0, plannedIncomeGuaranteed - plannedExpense)
  const safeToSpend = guaranteedForecast - savingsTarget
  const deficit = guaranteedForecast < 0 ? -guaranteedForecast : 0

  return {
    currentBalance,
    actualIncome,
    actualExpense,
    plannedIncomeFull,
    plannedIncomeWeighted,
    plannedIncomeGuaranteed,
    plannedExpense,
    upcomingIncomeGuaranteed,
    upcomingIncomeWeighted,
    upcomingIncomeOptimistic,
    upcomingExpense,
    guaranteedForecast,
    weightedForecast,
    optimisticForecast,
    plannedSavings,
    actualSavings,
    safeToSpend,
    deficit,
  }
}
