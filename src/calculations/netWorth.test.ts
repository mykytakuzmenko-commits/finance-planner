import { describe, it, expect } from 'vitest'
import { buildNetWorth } from './netWorth'
import type { Account, Transaction } from '../types/finance'

const rates = { UAH: 1, USD: 41, EUR: 45 }
let seq = 0
const tx = (o: Partial<Transaction>): Transaction => ({
  id: `t${seq++}`,
  type: 'expense',
  amount: 0,
  date: '2026-08-05',
  accountId: 'a',
  createdAt: 1,
  ...o,
})

describe('buildNetWorth', () => {
  const accounts: Account[] = [
    { id: 'a', name: 'Картка', initialBalance: 100_000, currency: 'UAH', createdAt: 1 },
    { id: 's', name: 'Подушка', initialBalance: 500_000, currency: 'UAH', isSavings: true, createdAt: 1 },
  ]
  const balances = new Map([
    ['a', 150_000],
    ['s', 500_000],
  ])

  it('sums all accounts and splits liquid vs savings', () => {
    const nw = buildNetWorth(accounts, balances, [], rates, '2026-08')
    expect(nw.current).toBe(650_000)
    expect(nw.liquid).toBe(150_000)
    expect(nw.savings).toBe(500_000)
  })

  it('converts foreign balances to base', () => {
    const accs: Account[] = [{ id: 'u', name: 'USD', initialBalance: 0, currency: 'USD', createdAt: 1 }]
    const nw = buildNetWorth(accs, new Map([['u', 1000]]), [], rates, '2026-08')
    expect(nw.current).toBe(41_000) // 1000 * 41
  })

  it('builds a monthly trend and month-over-month change from transactions', () => {
    // initial 100k+500k = 600k; +income 100k in Jul, -expense 50k in Aug → current 650k
    const txs = [
      tx({ type: 'income', amount: 100_000, date: '2026-07-10', accountId: 'a' }),
      tx({ type: 'expense', amount: 50_000, date: '2026-08-10', accountId: 'a' }),
    ]
    const nw = buildNetWorth(accounts, balances, txs, rates, '2026-08', 6)
    expect(nw.trend).toHaveLength(6)
    expect(nw.trend.at(-1)).toBe(650_000) // headline
    expect(nw.trend.at(-2)).toBe(700_000) // end of July (before Aug expense)
    expect(nw.changeAmount).toBe(-50_000) // 650k - 700k
    expect(nw.changePct).toBeCloseTo(-7.142, 2)
  })

  it('nets transfers out to zero for total worth', () => {
    const txs = [tx({ type: 'transfer', amount: 30_000, fromAccountId: 'a', toAccountId: 's', date: '2026-08-02' })]
    const nw = buildNetWorth(accounts, balances, txs, rates, '2026-08')
    // transfer moves money between own accounts → total unchanged vs no-tx baseline
    expect(nw.trend.at(-1)).toBe(650_000)
  })
})
