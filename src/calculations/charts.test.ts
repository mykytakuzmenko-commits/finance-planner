import { describe, it, expect } from 'vitest'
import { buildMonthlyCashFlow, buildExpenseBreakdown } from './charts'
import { currentMonth } from '../utils/month'
import type { Account, Category, Transaction } from '../types/finance'

const rates = { UAH: 1, USD: 41, EUR: 45 }
const acc = (id: string, currency = 'UAH'): Account => ({
  id,
  name: id,
  initialBalance: 0,
  currency: currency as Account['currency'],
  createdAt: 1,
})
const cat = (id: string, name: string, kind: 'income' | 'expense' = 'expense'): Category => ({
  id,
  name,
  kind,
  createdAt: 1,
})
let seq = 0
const tx = (o: Partial<Transaction>): Transaction => ({
  id: `t${seq++}`,
  type: 'expense',
  amount: 0,
  date: '2026-01-01',
  accountId: 'a',
  createdAt: 1,
  ...o,
})

describe('buildMonthlyCashFlow', () => {
  it('returns monthsBack points and flags only the last as current', () => {
    const points = buildMonthlyCashFlow([], [acc('a')], rates, 'UAH', 6)
    expect(points).toHaveLength(6)
    expect(points.at(-1)?.isCurrent).toBe(true)
    expect(points.slice(0, -1).every((p) => !p.isCurrent)).toBe(true)
  })

  it('sums income and expense (in major units) for the current month and ignores transfers', () => {
    const m = currentMonth()
    const points = buildMonthlyCashFlow(
      [
        tx({ type: 'income', amount: 1500000, date: `${m}-05` }), // 15 000
        tx({ type: 'expense', amount: 400000, date: `${m}-06` }), // 4 000
        tx({ type: 'transfer', amount: 999999, date: `${m}-07`, fromAccountId: 'a', toAccountId: 'b' }),
      ],
      [acc('a'), acc('b')],
      rates,
      'UAH',
      6,
    )
    const cur = points.at(-1)!
    expect(cur.income).toBe(15000)
    expect(cur.expense).toBe(4000)
    expect(cur.net).toBe(11000)
  })
})

describe('buildExpenseBreakdown', () => {
  it('aggregates expenses by category, sorted, with percentages', () => {
    const cats = [cat('food', 'Продукти'), cat('rent', 'Житло'), cat('sal', 'Зарплата', 'income')]
    const accounts = [acc('a')]
    const txs = [
      tx({ type: 'expense', amount: 300000, categoryId: 'rent', date: '2026-08-02' }), // 3000
      tx({ type: 'expense', amount: 100000, categoryId: 'food', date: '2026-08-03' }), // 1000
      tx({ type: 'income', amount: 500000, categoryId: 'sal', date: '2026-08-01' }), // excluded
      tx({ type: 'expense', amount: 999999, categoryId: 'food', date: '2026-07-15' }), // other month, excluded
    ]
    const slices = buildExpenseBreakdown(txs, cats, accounts, rates, 'UAH', '2026-08')
    expect(slices.map((s) => s.name)).toEqual(['Житло', 'Продукти'])
    expect(slices[0].value).toBe(3000)
    expect(slices[0].pct).toBeCloseTo(75, 5)
    expect(slices[1].pct).toBeCloseTo(25, 5)
  })
})
