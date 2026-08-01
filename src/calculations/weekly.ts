import type { Category, Transaction } from '../types/finance'
import type { WeeklyBudget } from '../types/weekly'
import { expenseStatus, type FactStatus } from './planFact'
import { daysLeftInWeek, isInWeek } from '../utils/week'

export interface WeeklyLimitReport {
  limitId: string
  categoryId: string
  categoryName: string
  limit: number
  spent: number
  remaining: number
  overspend: number
  status: FactStatus
}

export interface WeeklyReport {
  totalLimit: number
  /** Spend within budgeted categories. */
  totalSpent: number
  remaining: number
  overspend: number
  /** How much can be spent per remaining day without exceeding the budget. */
  dailySafe: number
  daysLeft: number
  lines: WeeklyLimitReport[]
  /** Expenses this week in categories that have no budget line. */
  otherSpent: number
}

export function buildWeeklyReport(
  weekStart: string,
  budget: WeeklyBudget | undefined,
  transactions: Transaction[],
  categories: Category[],
  todayISO: string,
): WeeklyReport {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const weekExpenses = transactions.filter(
    (t) => t.type === 'expense' && isInWeek(t.date, weekStart),
  )
  const spentByCategory = new Map<string, number>()
  for (const t of weekExpenses) {
    const key = t.categoryId ?? ''
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + t.amount)
  }

  const limits = budget?.limits ?? []
  const budgetedCategoryIds = new Set(limits.map((l) => l.categoryId))

  const lines: WeeklyLimitReport[] = limits.map((l) => {
    const spent = spentByCategory.get(l.categoryId) ?? 0
    const remaining = l.limit - spent
    return {
      limitId: l.id,
      categoryId: l.categoryId,
      categoryName: categoryName.get(l.categoryId) ?? 'Без категорії',
      limit: l.limit,
      spent,
      remaining,
      overspend: Math.max(0, -remaining),
      status: expenseStatus(l.limit, spent),
    }
  })

  const totalLimit = lines.reduce((a, l) => a + l.limit, 0)
  const totalSpent = lines.reduce((a, l) => a + l.spent, 0)
  const remaining = totalLimit - totalSpent
  const daysLeft = daysLeftInWeek(weekStart, todayISO)
  const dailySafe = remaining > 0 && daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0

  const otherSpent = weekExpenses
    .filter((t) => !t.categoryId || !budgetedCategoryIds.has(t.categoryId))
    .reduce((a, t) => a + t.amount, 0)

  return {
    totalLimit,
    totalSpent,
    remaining,
    overspend: Math.max(0, -remaining),
    dailySafe,
    daysLeft,
    lines,
    otherSpent,
  }
}
