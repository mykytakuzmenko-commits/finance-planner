import { describe, it, expect } from 'vitest'
import { buildForecast } from './forecast'
import type { Transaction } from '../types/finance'
import type { PlanItem } from '../types/planning'

let seq = 0
const tx = (type: Transaction['type'], amount: number): Transaction => ({
  id: `t${seq++}`,
  type,
  amount,
  date: '2026-08-05',
  accountId: 'a',
  createdAt: 1,
})
const plan = (kind: PlanItem['kind'], amount: number, probability?: number): PlanItem => ({
  id: `p${seq++}`,
  month: '2026-08',
  kind,
  name: kind,
  amount,
  probability,
  createdAt: 1,
})

describe('buildForecast', () => {
  it('with no plan, safe-to-spend equals the current balance', () => {
    const f = buildForecast(100000, [tx('income', 50000), tx('expense', 20000)], [])
    expect(f.actualIncome).toBe(50000)
    expect(f.actualExpense).toBe(20000)
    expect(f.actualSavings).toBe(30000)
    expect(f.guaranteedForecast).toBe(100000)
    expect(f.safeToSpend).toBe(100000)
    expect(f.deficit).toBe(0)
  })

  it('projects guaranteed income not yet received and keeps the savings target aside', () => {
    const f = buildForecast(0, [], [plan('income', 100000), plan('expense', 40000)])
    expect(f.upcomingIncomeGuaranteed).toBe(100000)
    expect(f.upcomingExpense).toBe(40000)
    expect(f.guaranteedForecast).toBe(60000)
    // Guaranteed savings target (income - expense) is reserved → nothing free to spend.
    expect(f.safeToSpend).toBe(0)
  })

  it('reports a deficit when even guaranteed funds fall short', () => {
    const f = buildForecast(0, [], [plan('expense', 50000)])
    expect(f.guaranteedForecast).toBe(-50000)
    expect(f.deficit).toBe(50000)
  })

  it('separates weighted, guaranteed and optimistic income by probability', () => {
    const f = buildForecast(0, [], [plan('income', 100000, 50)])
    expect(f.plannedIncomeGuaranteed).toBe(0) // uncertain → excluded from guaranteed
    expect(f.plannedIncomeWeighted).toBe(50000) // 50% weight
    expect(f.plannedIncomeFull).toBe(100000) // optimistic
  })
})
