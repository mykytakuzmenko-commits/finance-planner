import type { Account, Category, Transaction } from '../types/finance'
import type { CurrencyCode } from '../types/settings'
import { toBase, type ExchangeRates } from '../utils/rates'
import { addMonths, currentMonth } from '../utils/month'

const MONTH_SHORT = [
  'Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер',
  'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру',
]

function shortMonth(month: string): string {
  const m = Number(month.split('-')[1])
  return MONTH_SHORT[m - 1] ?? month
}

export interface CashFlowPoint {
  month: string
  label: string
  income: number
  expense: number
  net: number
}

/** Income / expense / net per month (base currency, minor→major units) for the last N months. */
export function buildMonthlyCashFlow(
  transactions: Transaction[],
  accounts: Account[],
  rates: ExchangeRates,
  base: CurrencyCode,
  monthsBack = 6,
): CashFlowPoint[] {
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
  const now = currentMonth()
  const points: CashFlowPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const month = addMonths(now, -i)
    const monthTx = transactions.filter((t) => t.date.startsWith(`${month}-`))
    let income = 0
    let expense = 0
    for (const t of monthTx) {
      const cur = accCur.get(t.accountId ?? '') ?? base
      const val = toBase(t.amount, cur, rates) / 100
      if (t.type === 'income') income += val
      else if (t.type === 'expense') expense += val
    }
    points.push({
      month,
      label: shortMonth(month),
      income: Math.round(income),
      expense: Math.round(expense),
      net: Math.round(income - expense),
    })
  }
  return points
}

export interface CategorySlice {
  name: string
  value: number // base, major units
  pct: number
}

/** Expense breakdown by category for a month (base currency), largest first. */
export function buildExpenseBreakdown(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  rates: ExchangeRates,
  base: CurrencyCode,
  month: string,
): CategorySlice[] {
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const totals = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(`${month}-`)) continue
    const cur = accCur.get(t.accountId ?? '') ?? base
    const val = toBase(t.amount, cur, rates) / 100
    const key = t.categoryId ?? ''
    totals.set(key, (totals.get(key) ?? 0) + val)
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([id, value]) => ({
      name: id ? catName.get(id) ?? 'Без категорії' : 'Без категорії',
      value: Math.round(value),
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}
