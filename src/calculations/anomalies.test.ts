import { describe, it, expect } from 'vitest'
import { detectAnomalies } from './anomalies'
import type { Account, Category, Transaction } from '../types/finance'

const rates = { UAH: 1, USD: 41, EUR: 45 }
const accounts: Account[] = [
  { id: 'a', name: 'Картка', initialBalance: 0, currency: 'UAH', createdAt: 1 },
]
const categories: Category[] = [
  { id: 'food', name: 'Кафе', kind: 'expense', createdAt: 1 },
  { id: 'rent', name: 'Житло', kind: 'expense', createdAt: 1 },
  { id: 'fun', name: 'Розваги', kind: 'expense', createdAt: 1 },
]
let seq = 0
const tx = (date: string, amount: number, categoryId: string): Transaction => ({
  id: `t${seq++}`,
  type: 'expense',
  amount,
  date,
  accountId: 'a',
  categoryId,
  createdAt: 1,
})

describe('detectAnomalies', () => {
  it('flags a category spending far above its own average', () => {
    const txs = [
      // Кафе: Jun 1000, Jul 1000 → Aug 3000 = 3x  => anomaly
      tx('2026-06-15', 100000, 'food'),
      tx('2026-07-15', 100000, 'food'),
      tx('2026-08-02', 300000, 'food'),
      // Житло: steady 5000 → not an anomaly
      tx('2026-06-01', 500000, 'rent'),
      tx('2026-07-01', 500000, 'rent'),
      tx('2026-08-01', 500000, 'rent'),
      // Розваги: only this month, no history => skipped
      tx('2026-08-03', 200000, 'fun'),
    ]
    const result = detectAnomalies(txs, categories, accounts, rates, 'UAH', '2026-08')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Кафе')
    expect(result[0].ratio).toBeCloseTo(3, 5)
  })

  it('returns nothing when there is no prior history', () => {
    const txs = [tx('2026-08-02', 300000, 'food')]
    expect(detectAnomalies(txs, categories, accounts, rates, 'UAH', '2026-08')).toEqual([])
  })

  it('ignores small overages below the absolute floor', () => {
    const txs = [
      tx('2026-06-15', 10000, 'food'), // 100
      tx('2026-07-15', 10000, 'food'), // 100
      tx('2026-08-02', 30000, 'food'), // 300 — 3x but overage 200 < floor 500
    ]
    expect(detectAnomalies(txs, categories, accounts, rates, 'UAH', '2026-08')).toEqual([])
  })
})
