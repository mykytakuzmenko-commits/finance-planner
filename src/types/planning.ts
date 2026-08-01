export type PlanKind = 'income' | 'expense'
export type PlanCadence = 'monthly' | 'quarterly'

/**
 * A recurring rule that materializes a PlanItem into each applicable month.
 * One-time entries do NOT use a template (their PlanItem has no templateId).
 */
export interface PlanTemplate {
  id: string
  kind: PlanKind
  name: string
  amount: number // minor units
  categoryId?: string
  cadence: PlanCadence
  /** 0–100 for probable income (e.g. a bonus); undefined means certain (100%). */
  probability?: number
  /** First month this template applies to, 'YYYY-MM'. Also the quarterly anchor. */
  startMonth: string
  active: boolean
  createdAt: number
}

/** A materialized planned line for one specific month. */
export interface PlanItem {
  id: string
  month: string // 'YYYY-MM'
  kind: PlanKind
  name: string
  amount: number // minor units
  categoryId?: string
  probability?: number // 0–100 for income
  /** Set when generated from a recurring template; absent for one-time entries. */
  templateId?: string
  createdAt: number
}

/** Registry of months that have been materialized (so empty months persist). */
export interface PlanMonth {
  month: string // 'YYYY-MM'
  createdAt: number
}

/** Whether an edit/delete applies to just this month or this + all future months. */
export type PlanScope = 'single' | 'future'
