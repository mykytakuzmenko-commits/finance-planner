import { useMemo } from 'react'
import { useData } from '../state/DataContext'
import { usePlanning } from '../state/PlanningContext'
import { useSettings } from '../state/SettingsContext'
import { useSavingsGoals } from '../state/SavingsGoalsContext'
import { useWeeklyBudget } from '../state/WeeklyBudgetContext'
import { currentMonth } from '../utils/month'
import { currentWeekStart } from '../utils/week'
import { todayISO } from '../utils/date'
import { toBase } from '../utils/rates'
import { buildForecast } from '../calculations/forecast'
import { buildPlanFact } from '../calculations/planFact'
import { buildSavingsSummary } from '../calculations/savings'
import { buildWeeklyReport } from '../calculations/weekly'
import { buildRecommendations, type RecoContext } from '../calculations/recommendations'
import { detectAnomalies } from '../calculations/anomalies'
import type { Recommendation } from '../types/recommendation'

export function useRecommendations(): Recommendation[] {
  const { accounts, categories, transactions, balances } = useData()
  const { itemsForMonth } = usePlanning()
  const { settings } = useSettings()
  const { goals } = useSavingsGoals()
  const { getBudget } = useWeeklyBudget()

  const base = settings.baseCurrency
  const rates = settings.exchangeRates
  const month = currentMonth()
  const week = currentWeekStart()
  const today = todayISO()
  const planItems = itemsForMonth(month)
  const budget = getBudget(week)

  return useMemo(() => {
    const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
    const curOf = (id?: string) => (id ? accCur.get(id) ?? base : base)

    const currentBalanceBase = accounts.reduce(
      (s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates),
      0,
    )
    const monthTx = transactions.filter((t) => t.date.startsWith(`${month}-`))
    const monthTxBase = monthTx.map((t) => ({
      ...t,
      amount: toBase(t.amount, curOf(t.accountId), rates),
    }))
    const forecast = buildForecast(currentBalanceBase, monthTxBase, planItems)

    // Overspent expense categories (plan-fact).
    const fact = buildPlanFact(month, planItems, transactions, categories, today)
    const overspent = fact.categories
      .filter((c) => c.kind === 'expense' && c.status === 'overspent' && c.actual > c.planned)
      .map((c) => ({ name: c.categoryName, over: c.actual - c.planned }))
      .sort((a, b) => b.over - a.over)

    // Emergency fund & goals.
    const plannedExpense = planItems
      .filter((i) => i.kind === 'expense')
      .reduce((s, i) => s + i.amount, 0)
    const actualExpenseBase = monthTxBase
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const monthlyExpense = plannedExpense > 0 ? plannedExpense : actualExpenseBase
    const summary = buildSavingsSummary(
      accounts,
      balances,
      rates,
      settings.emergencyTargetMonths,
      monthlyExpense,
      goals,
    )
    const shortfallBase = Math.max(
      0,
      Math.round((summary.targetMonths - summary.coverageMonths) * monthlyExpense),
    )
    const recoGoals = summary.goals.map((g) => ({
      name: g.goal.name,
      currency: g.goal.currency,
      remaining: g.remaining,
      remainingBase: toBase(g.remaining, g.goal.currency, rates),
      isForeign: g.goal.currency !== base,
    }))

    // Weekly budget.
    const weekReport = buildWeeklyReport(week, budget, transactions, categories, today)

    const anomalies = detectAnomalies(transactions, categories, accounts, rates, base, month)

    const ctx: RecoContext = {
      base,
      hasAccounts: accounts.length > 0,
      hasPlan: planItems.length > 0,
      forecast,
      overspent,
      anomalies,
      emergency: {
        coverageMonths: summary.coverageMonths,
        targetMonths: summary.targetMonths,
        monthlyExpense,
        shortfallBase,
      },
      goals: recoGoals,
      weekly: { hasBudget: (budget?.limits.length ?? 0) > 0, overspend: weekReport.overspend },
      allocatableBase: Math.max(0, forecast.safeToSpend),
    }

    return buildRecommendations(ctx)
  }, [
    accounts,
    balances,
    transactions,
    categories,
    planItems,
    goals,
    budget,
    base,
    rates,
    month,
    week,
    today,
    settings.emergencyTargetMonths,
  ])
}
