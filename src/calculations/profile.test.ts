import { describe, it, expect } from 'vitest'
import { buildProfile, type ProfileInput } from './profile'
import { buildForecast } from './forecast'
import type { Account, Category, Transaction } from '../types/finance'
import type { SavingsSummary } from './savings'
import type { SavingsGoal } from '../types/savings'

const rates = { UAH: 1, USD: 41, EUR: 45 }
const accounts: Account[] = [
  { id: 'a', name: 'Картка', initialBalance: 0, currency: 'UAH', createdAt: 1 },
]
const categories: Category[] = [{ id: 'food', name: 'Продукти', kind: 'expense', createdAt: 1 }]

let seq = 0
const tx = (date: string, type: Transaction['type'], amount: number): Transaction => ({
  id: `t${seq++}`,
  type,
  amount,
  date,
  accountId: 'a',
  categoryId: type === 'expense' ? 'food' : undefined,
  createdAt: 1,
})

const savings: SavingsSummary = {
  totalBase: 1_000_000,
  savingsBase: 1_000_000,
  allocation: [],
  emergencyFundBase: 1_000_000,
  monthlyExpense: 600_000,
  coverageMonths: 3,
  targetMonths: 3,
  coveragePct: 100,
  goals: [],
}
const goals: SavingsGoal[] = [
  { id: 'g', name: 'Відпустка', currency: 'UAH', target: 1000, saved: 1000, createdAt: 1 },
]

const baseInput = (over: Partial<ProfileInput> = {}): ProfileInput => ({
  transactions: [
    tx('2026-06-01', 'income', 1_000_000),
    tx('2026-06-10', 'expense', 600_000),
    tx('2026-07-01', 'income', 1_000_000),
    tx('2026-07-10', 'expense', 600_000),
    tx('2026-08-01', 'income', 1_000_000),
    tx('2026-08-10', 'expense', 600_000),
  ],
  categories,
  accounts,
  rates,
  base: 'UAH',
  savings,
  forecast: buildForecast(500_000, [], []), // no deficit, safeToSpend = 500k
  goals,
  discipline: null,
  ...over,
})

describe('buildProfile', () => {
  it('computes lifetime stats over all months', () => {
    const { lifetime } = buildProfile(baseInput())
    expect(lifetime.monthsTracked).toBe(3)
    expect(lifetime.totalIncome).toBe(3_000_000)
    expect(lifetime.totalExpense).toBe(1_800_000)
    expect(lifetime.avgSavingsRatePct).toBe(40) // (10000-6000)/10000
    expect(lifetime.bestMonthNet).toBe(400_000)
    expect(lifetime.topCategoryName).toBe('Продукти')
  })

  it('scores a healthy profile highly', () => {
    const { health } = buildProfile(baseInput())
    expect(health.score).toBeGreaterThanOrEqual(80)
    expect(health.tier).toBe('Відмінно')
    expect(health.metrics.map((m) => m.key)).toContain('savings')
  })

  it('awards achievements based on the data', () => {
    const { achievements } = buildProfile(baseInput())
    const earned = new Set(achievements.filter((a) => a.earned).map((a) => a.id))
    expect(earned.has('track3')).toBe(true)
    expect(earned.has('track6')).toBe(false) // only 3 months
    expect(earned.has('cushion10k')).toBe(true)
    expect(earned.has('cushion3m')).toBe(true)
    expect(earned.has('nodeficit')).toBe(true)
    expect(earned.has('streak')).toBe(true)
    expect(earned.has('goal')).toBe(true)
  })

  it('reflects a deficit in the cash-flow metric and tier', () => {
    const { health, achievements } = buildProfile(
      baseInput({ forecast: buildForecast(0, [], [{ id: 'p', month: '2026-08', kind: 'expense', name: 'x', amount: 900_000, createdAt: 1 }]) }),
    )
    const cf = health.metrics.find((m) => m.key === 'cashflow')!
    expect(cf.score).toBe(20)
    expect(achievements.find((a) => a.id === 'nodeficit')!.earned).toBe(false)
  })

  it('includes a discipline metric only when a plan exists', () => {
    const withPlan = buildProfile(baseInput({ discipline: { planned: 4, withinPlan: 3 } }))
    expect(withPlan.health.metrics.some((m) => m.key === 'discipline')).toBe(true)
    const noPlan = buildProfile(baseInput({ discipline: null }))
    expect(noPlan.health.metrics.some((m) => m.key === 'discipline')).toBe(false)
  })
})
