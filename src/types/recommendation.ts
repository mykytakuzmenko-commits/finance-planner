import type { CurrencyCode } from './settings'

export type Confidence = 'high' | 'medium' | 'low'
export type RecoCategory = 'cashflow' | 'budget' | 'savings' | 'currency' | 'positive'

export interface Recommendation {
  id: string
  title: string
  /** Why this is suggested (explanation of the underlying signal). */
  reason: string
  /** Suggested, optional action — always phrased cautiously. */
  action?: string
  /** A single amount, in minor units. */
  amount?: number
  /** A suggested range [min, max], in minor units. */
  range?: [number, number]
  /** Currency of amount/range; defaults to base. */
  currency?: CurrencyCode
  confidence: Confidence
  category: RecoCategory
  /** Higher = more important; personal-data signals rank above opportunities. */
  severity: number
}
