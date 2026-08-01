import type { CurrencyCode } from './settings'

export interface SavingsGoal {
  id: string
  name: string
  currency: CurrencyCode
  /** Target amount in minor units, in the goal's currency. */
  target: number
  /** Amount saved so far in minor units, in the goal's currency. */
  saved: number
  createdAt: number
}
