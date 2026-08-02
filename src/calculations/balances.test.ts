import { describe, it, expect } from 'vitest'
import { computeAccountBalances, sumByType, totalBalance } from './balances'
import type { Account, Transaction } from '../types/finance'

const acc = (id: string, initialBalance: number, currency = 'UAH'): Account => ({
  id,
  name: id,
  initialBalance,
  currency: currency as Account['currency'],
  createdAt: 1,
})

let seq = 0
const tx = (o: Partial<Transaction>): Transaction => ({
  id: `t${seq++}`,
  type: 'expense',
  amount: 0,
  date: '2026-08-01',
  createdAt: 1,
  ...o,
})

describe('computeAccountBalances', () => {
  it('applies income and expense to the account', () => {
    const balances = computeAccountBalances(
      [acc('a', 1000)],
      [
        tx({ type: 'income', amount: 500, accountId: 'a' }),
        tx({ type: 'expense', amount: 200, accountId: 'a' }),
      ],
    )
    expect(balances.get('a')).toBe(1300)
  })

  it('debits source and credits destination on a transfer', () => {
    const balances = computeAccountBalances(
      [acc('a', 1000), acc('b', 0)],
      [tx({ type: 'transfer', amount: 300, fromAccountId: 'a', toAccountId: 'b' })],
    )
    expect(balances.get('a')).toBe(700)
    expect(balances.get('b')).toBe(300)
  })

  it('uses toAmount for the destination on a cross-currency transfer', () => {
    const balances = computeAccountBalances(
      [acc('a', 1000, 'USD'), acc('b', 0, 'UAH')],
      [tx({ type: 'transfer', amount: 300, toAmount: 12300, fromAccountId: 'a', toAccountId: 'b' })],
    )
    expect(balances.get('a')).toBe(700)
    expect(balances.get('b')).toBe(12300)
  })

  it('ignores transactions pointing at unknown accounts', () => {
    const balances = computeAccountBalances(
      [acc('a', 100)],
      [tx({ type: 'expense', amount: 50, accountId: 'ghost' })],
    )
    expect(balances.get('a')).toBe(100)
  })
})

describe('sumByType', () => {
  it('sums only the requested type', () => {
    const txs = [
      tx({ type: 'income', amount: 100 }),
      tx({ type: 'income', amount: 50 }),
      tx({ type: 'expense', amount: 30 }),
      tx({ type: 'transfer', amount: 999, fromAccountId: 'a', toAccountId: 'b' }),
    ]
    expect(sumByType(txs, 'income')).toBe(150)
    expect(sumByType(txs, 'expense')).toBe(30)
  })
})

describe('totalBalance', () => {
  it('sums all account balances', () => {
    const map = new Map([
      ['a', 1000],
      ['b', -200],
      ['c', 50],
    ])
    expect(totalBalance(map)).toBe(850)
  })
})
