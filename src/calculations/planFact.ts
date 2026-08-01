import type { Category, Transaction } from '../types/finance'
import type { PlanItem, PlanKind } from '../types/planning'

export type FactStatus = 'on-track' | 'warning' | 'overspent'

const WARNING_RATIO = 0.85

export function expenseStatus(planned: number, actual: number): FactStatus {
  if (planned <= 0) return actual > 0 ? 'overspent' : 'on-track'
  const ratio = actual / planned
  if (ratio > 1) return 'overspent'
  if (ratio >= WARNING_RATIO) return 'warning'
  return 'on-track'
}

export function incomeStatus(planned: number, actual: number): FactStatus {
  if (planned <= 0) return 'on-track'
  return actual >= planned ? 'on-track' : 'warning'
}

function statusFor(kind: PlanKind, planned: number, actual: number): FactStatus {
  return kind === 'expense'
    ? expenseStatus(planned, actual)
    : incomeStatus(planned, actual)
}

export interface PlanItemFact {
  item: PlanItem
  planned: number
  actual: number
  linkedTxIds: string[]
  status: FactStatus
}

export interface CategoryFact {
  key: string
  categoryId?: string
  categoryName: string
  kind: PlanKind
  planned: number
  actual: number
  /** Income: actual − planned. Expense: planned − actual (positive = saved). */
  deviation: number
  status: FactStatus
}

export interface PlanFact {
  plannedIncome: number
  actualIncome: number
  plannedExpense: number
  actualExpense: number
  /** actual − planned (positive = more income than planned). */
  incomeDeviation: number
  /** planned − actual (positive = saved, negative = overspent). */
  expenseDeviation: number

  plannedIncomeToDate: number
  plannedExpenseToDate: number
  actualIncomeToDate: number
  actualExpenseToDate: number

  items: PlanItemFact[]
  categories: CategoryFact[]
  unlinked: Transaction[]
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Expected ISO date of a plan item: its due day, or the last day of the month. */
function expectedDate(item: PlanItem): string {
  const day = item.dueDay ?? daysInMonth(item.month)
  return `${item.month}-${String(day).padStart(2, '0')}`
}

export function buildPlanFact(
  month: string,
  planItems: PlanItem[],
  transactions: Transaction[],
  categories: Category[],
  todayISO: string,
): PlanFact {
  const monthTx = transactions.filter(
    (t) => t.date.startsWith(`${month}-`) && (t.type === 'income' || t.type === 'expense'),
  )
  const planItemIds = new Set(planItems.map((i) => i.id))
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))

  const sum = (arr: { amount: number }[]) => arr.reduce((a, x) => a + x.amount, 0)

  const plannedIncome = sum(planItems.filter((i) => i.kind === 'income'))
  const plannedExpense = sum(planItems.filter((i) => i.kind === 'expense'))
  const actualIncome = sum(monthTx.filter((t) => t.type === 'income'))
  const actualExpense = sum(monthTx.filter((t) => t.type === 'expense'))

  // To-date: plan items whose expected date has passed; transactions dated up to today.
  const toDate = (items: PlanItem[]) =>
    sum(items.filter((i) => expectedDate(i) <= todayISO))
  const txToDate = (txs: Transaction[]) => sum(txs.filter((t) => t.date <= todayISO))

  // Per-plan-item fulfilment (from linked transactions).
  const items: PlanItemFact[] = planItems.map((item) => {
    const linked = transactions.filter((t) => t.planItemId === item.id)
    const actual = sum(linked)
    return {
      item,
      planned: item.amount,
      actual,
      linkedTxIds: linked.map((t) => t.id),
      status: statusFor(item.kind, item.amount, actual),
    }
  })

  // Category breakdown: planned vs all actual transactions of that category.
  const catMap = new Map<string, CategoryFact>()
  const keyOf = (kind: PlanKind, categoryId?: string) => `${kind}:${categoryId ?? ''}`
  const ensureCat = (kind: PlanKind, categoryId?: string): CategoryFact => {
    const key = keyOf(kind, categoryId)
    let c = catMap.get(key)
    if (!c) {
      c = {
        key,
        categoryId,
        categoryName: categoryId ? categoryName.get(categoryId) ?? 'Без категорії' : 'Без категорії',
        kind,
        planned: 0,
        actual: 0,
        deviation: 0,
        status: 'on-track',
      }
      catMap.set(key, c)
    }
    return c
  }
  for (const i of planItems) ensureCat(i.kind, i.categoryId).planned += i.amount
  for (const t of monthTx) {
    const kind = t.type as PlanKind
    ensureCat(kind, t.categoryId).actual += t.amount
  }
  const catList = [...catMap.values()].map((c) => {
    c.deviation = c.kind === 'income' ? c.actual - c.planned : c.planned - c.actual
    c.status = statusFor(c.kind, c.planned, c.actual)
    return c
  })
  catList.sort((a, b) => (a.kind === b.kind ? b.actual - a.actual : a.kind === 'expense' ? -1 : 1))

  // Fact without plan: month transactions not linked to a plan item of this month.
  const unlinked = monthTx.filter(
    (t) => !t.planItemId || !planItemIds.has(t.planItemId),
  )

  return {
    plannedIncome,
    actualIncome,
    plannedExpense,
    actualExpense,
    incomeDeviation: actualIncome - plannedIncome,
    expenseDeviation: plannedExpense - actualExpense,
    plannedIncomeToDate: toDate(planItems.filter((i) => i.kind === 'income')),
    plannedExpenseToDate: toDate(planItems.filter((i) => i.kind === 'expense')),
    actualIncomeToDate: txToDate(monthTx.filter((t) => t.type === 'income')),
    actualExpenseToDate: txToDate(monthTx.filter((t) => t.type === 'expense')),
    items,
    categories: catList,
    unlinked,
  }
}

/**
 * Suggest transactions that plausibly fulfil a plan item: same month & kind,
 * matching category when the plan specifies one, not already linked elsewhere.
 * Ranked by closeness to the still-unfilled amount.
 */
export function suggestMatches(
  item: PlanItem,
  transactions: Transaction[],
  alreadyLinkedActual: number,
): Transaction[] {
  const remaining = Math.max(0, item.amount - alreadyLinkedActual)
  return transactions
    .filter(
      (t) =>
        t.type === item.kind &&
        t.date.startsWith(`${item.month}-`) &&
        !t.planItemId &&
        (!item.categoryId || t.categoryId === item.categoryId),
    )
    .sort((a, b) => Math.abs(a.amount - remaining) - Math.abs(b.amount - remaining))
}
