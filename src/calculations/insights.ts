import type { CashFlowPoint, CategorySlice } from './charts'

export type InsightTone = 'good' | 'bad' | 'neutral'

export interface Insight {
  id: string
  mark: string // arrow or symbol shown before the value
  tone: InsightTone
  label: string
  value: string
}

const pctChange = (cur: number, prev: number) => ((cur - prev) / prev) * 100

/**
 * Compact "at a glance" insights for the dashboard.
 *
 * Month-over-month always compares the two most recent COMPLETE months —
 * never the in-progress current month, which would always look "down"
 * early in the month and read as a false negative trend.
 */
export function buildInsights(
  cashFlow: CashFlowPoint[],
  breakdown: CategorySlice[],
): Insight[] {
  const insights: Insight[] = []
  const completed = cashFlow.filter((p) => !p.isCurrent)
  const current = cashFlow.find((p) => p.isCurrent)
  const lastC = completed.at(-1)
  const prevC = completed.at(-2)

  // Record income — last complete month is the highest in the window.
  const incomeMonths = cashFlow.filter((p) => p.income > 0)
  if (lastC && lastC.income > 0 && incomeMonths.length >= 3) {
    const maxIncome = Math.max(...incomeMonths.map((p) => p.income))
    if (lastC.income === maxIncome) {
      insights.push({
        id: 'rec-income',
        mark: '★',
        tone: 'good',
        label: 'Рекордний дохід',
        value: 'за 6 міс.',
      })
    }
  }

  // Expense month-over-month (completed months): spending up is bad.
  if (lastC && prevC && prevC.expense > 0) {
    const p = pctChange(lastC.expense, prevC.expense)
    insights.push({
      id: 'exp-mom',
      mark: p >= 0 ? '↑' : '↓',
      tone: p > 0 ? 'bad' : 'good',
      label: 'Витрати місяць-до-місяця',
      value: `${Math.abs(p).toFixed(0)}%`,
    })
  }

  // Income month-over-month (completed months): income up is good.
  if (lastC && prevC && prevC.income > 0) {
    const p = pctChange(lastC.income, prevC.income)
    insights.push({
      id: 'inc-mom',
      mark: p >= 0 ? '↑' : '↓',
      tone: p >= 0 ? 'good' : 'bad',
      label: 'Дохід місяць-до-місяця',
      value: `${Math.abs(p).toFixed(0)}%`,
    })
  }

  // Biggest spending category this month so far.
  if (breakdown.length > 0) {
    const top = breakdown[0]
    insights.push({
      id: 'top-cat',
      mark: '•',
      tone: 'neutral',
      label: `Топ-стаття: ${top.name}`,
      value: `${top.pct.toFixed(0)}%`,
    })
  }

  // Pacing — current month spend vs the average of completed months.
  const withExpense = completed.filter((p) => p.expense > 0)
  if (current && current.expense > 0 && withExpense.length >= 2) {
    const avg = withExpense.reduce((a, p) => a + p.expense, 0) / withExpense.length
    if (avg > 0) {
      const p = (current.expense / avg) * 100
      insights.push({
        id: 'pacing',
        mark: '•',
        tone: p > 100 ? 'bad' : 'neutral',
        label: 'Цього місяця від середніх витрат',
        value: `${p.toFixed(0)}%`,
      })
    }
  }

  return insights.slice(0, 4)
}
