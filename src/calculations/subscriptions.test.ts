import { describe, it, expect } from 'vitest'
import { detectSubscriptions } from './subscriptions'
import type { Account, Category, Transaction } from '../types/finance'

const rates = { UAH: 1, USD: 41, EUR: 45 }
const accounts: Account[] = [
  { id: 'a', name: 'Картка', initialBalance: 0, currency: 'UAH', createdAt: 1 },
]
const categories: Category[] = [
  { id: 'fun', name: 'Розваги', kind: 'expense', createdAt: 1 },
  { id: 'rent', name: 'Житло', kind: 'expense', createdAt: 1 },
]
let seq = 0
const tx = (o: Partial<Transaction>): Transaction => ({
  id: `t${seq++}`,
  type: 'expense',
  amount: 0,
  date: '2026-08-05',
  accountId: 'a',
  categoryId: 'fun',
  createdAt: 1,
  ...o,
})

describe('detectSubscriptions', () => {
  it('detects a monthly subscription and labels it from a consistent note', () => {
    const txs = [
      tx({ amount: 19900, date: '2026-06-05', note: 'Netflix' }),
      tx({ amount: 19900, date: '2026-07-05', note: 'Netflix' }),
      tx({ amount: 19900, date: '2026-08-05', note: 'Netflix' }),
    ]
    const subs = detectSubscriptions(txs, categories, accounts, rates, 'UAH', '2026-08')
    expect(subs).toHaveLength(1)
    expect(subs[0]).toMatchObject({
      label: 'Netflix',
      cadence: 'monthly',
      amount: 19900,
      monthlyEquivalent: 19900,
      count: 3,
      confidence: 'high',
    })
    expect(subs[0].nextDate).toBe('2026-09-05') // 2026-08-05 + median gap (31d)
  })

  it('absorbs small amount drift within tolerance (±5%)', () => {
    const txs = [
      tx({ amount: 19900, date: '2026-07-05' }),
      tx({ amount: 20400, date: '2026-08-05' }), // +2.5% → same subscription
    ]
    const subs = detectSubscriptions(txs, categories, accounts, rates, 'UAH', '2026-08')
    expect(subs).toHaveLength(1)
    expect(subs[0].count).toBe(2)
    expect(subs[0].confidence).toBe('medium')
    expect(subs[0].label).toBe('Розваги') // no consistent note → category
  })

  it('ignores one-off charges and single-month repeats', () => {
    const oneOff = detectSubscriptions([tx({ amount: 50000, date: '2026-08-05' })], categories, accounts, rates, 'UAH', '2026-08')
    expect(oneOff).toEqual([])

    const sameMonth = detectSubscriptions(
      [tx({ amount: 30000, date: '2026-08-03' }), tx({ amount: 30000, date: '2026-08-20' })],
      categories,
      accounts,
      rates,
      'UAH',
      '2026-08',
    )
    expect(sameMonth).toEqual([]) // two charges but only one distinct month
  })

  it('keeps distinct amounts in the same category as separate items', () => {
    const txs = [
      // recurring 199
      tx({ amount: 19900, date: '2026-06-05' }),
      tx({ amount: 19900, date: '2026-07-05' }),
      // unrelated large one-off 900 (>5% apart) → not recurring
      tx({ amount: 90000, date: '2026-07-20' }),
    ]
    const subs = detectSubscriptions(txs, categories, accounts, rates, 'UAH', '2026-08')
    expect(subs).toHaveLength(1)
    expect(subs[0].amount).toBe(19900)
  })

  it('ignores income transactions', () => {
    const txs = [
      tx({ type: 'income', amount: 1500000, date: '2026-06-01' }),
      tx({ type: 'income', amount: 1500000, date: '2026-07-01' }),
      tx({ type: 'income', amount: 1500000, date: '2026-08-01' }),
    ]
    expect(detectSubscriptions(txs, categories, accounts, rates, 'UAH', '2026-08')).toEqual([])
  })
})
