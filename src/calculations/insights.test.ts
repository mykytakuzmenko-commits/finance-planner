import { describe, it, expect } from 'vitest'
import { buildInsights } from './insights'
import type { CashFlowPoint, CategorySlice } from './charts'

const cashFlow: CashFlowPoint[] = [
  { month: '2026-06', label: 'Чер', income: 10000, expense: 5000, net: 5000, isCurrent: false },
  { month: '2026-07', label: 'Лип', income: 12000, expense: 6000, net: 6000, isCurrent: false },
  { month: '2026-08', label: 'Сер', income: 3000, expense: 8000, net: -5000, isCurrent: true },
]
const breakdown: CategorySlice[] = [
  { name: 'Житло', value: 5000, pct: 62.5 },
  { name: 'Продукти', value: 3000, pct: 37.5 },
]

describe('buildInsights', () => {
  it('computes month-over-month from completed months only', () => {
    const insights = buildInsights(cashFlow, breakdown)
    const exp = insights.find((i) => i.id === 'exp-mom')
    const inc = insights.find((i) => i.id === 'inc-mom')
    // Jul vs Jun — NOT the in-progress August.
    expect(exp).toMatchObject({ mark: '↑', tone: 'bad', value: '20%' })
    expect(inc).toMatchObject({ mark: '↑', tone: 'good', value: '20%' })
  })

  it('adds a record-income chip when the last complete month is the highest', () => {
    const insights = buildInsights(cashFlow, breakdown)
    expect(insights.some((i) => i.id === 'rec-income')).toBe(true)
  })

  it('caps the strip at four chips', () => {
    const insights = buildInsights(cashFlow, breakdown)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('returns nothing useful without history', () => {
    const only = [cashFlow[2]]
    expect(buildInsights(only, [])).toEqual([])
  })
})
