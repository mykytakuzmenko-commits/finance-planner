export interface WeeklyLimit {
  id: string
  categoryId: string
  /** Weekly limit for this category, in minor units. */
  limit: number
}

export interface WeeklyBudget {
  id: string
  /** Monday of the week, 'YYYY-MM-DD'. */
  weekStart: string
  limits: WeeklyLimit[]
  createdAt: number
}
