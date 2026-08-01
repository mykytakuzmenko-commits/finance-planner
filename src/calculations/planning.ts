import type { PlanItem, PlanTemplate } from '../types/planning'
import { createId } from '../utils/id'
import { monthAbs } from '../utils/month'

/** Does a template produce an item in the given month? */
export function templateAppliesTo(template: PlanTemplate, month: string): boolean {
  if (!template.active) return false
  const diff = monthAbs(month) - monthAbs(template.startMonth)
  if (diff < 0) return false
  return template.cadence === 'monthly' ? true : diff % 3 === 0
}

/** Materialize the plan items a set of templates generate for one month. */
export function generateItemsForMonth(
  month: string,
  templates: PlanTemplate[],
): PlanItem[] {
  const now = Date.now()
  return templates
    .filter((t) => templateAppliesTo(t, month))
    .map((t, i) => ({
      id: createId(),
      month,
      kind: t.kind,
      name: t.name,
      amount: t.amount,
      categoryId: t.categoryId,
      probability: t.probability,
      dueDay: t.dueDay,
      templateId: t.id,
      createdAt: now + i,
    }))
}

export interface PlanSummary {
  incomeFull: number
  incomeWeighted: number
  expense: number
  balanceFull: number
  balanceWeighted: number
}

/** Probability weight (0–1); certain when unset. */
function weight(item: PlanItem): number {
  if (item.probability === undefined) return 1
  return Math.max(0, Math.min(100, item.probability)) / 100
}

export function summarizePlan(items: PlanItem[]): PlanSummary {
  let incomeFull = 0
  let incomeWeighted = 0
  let expense = 0
  for (const item of items) {
    if (item.kind === 'income') {
      incomeFull += item.amount
      incomeWeighted += Math.round(item.amount * weight(item))
    } else {
      expense += item.amount
    }
  }
  return {
    incomeFull,
    incomeWeighted,
    expense,
    balanceFull: incomeFull - expense,
    balanceWeighted: incomeWeighted - expense,
  }
}
