import type { Account, Category, Transaction } from '../types/finance'
import type { CurrencyCode } from '../types/settings'
import { toBase, type ExchangeRates } from '../utils/rates'
import { addMonths } from '../utils/month'

export interface SpendAnomaly {
  name: string
  current: number // base minor units spent this month
  avg: number // base minor units, typical for this category
  ratio: number // current / avg
}

/**
 * Flag expense categories where this month's spending is well above the user's
 * own typical level. Compared against the average of PRIOR active months only,
 * so a brand-new category never trips (no history → no anomaly) and the
 * in-progress current month is never used as its own baseline.
 */
export function detectAnomalies(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  rates: ExchangeRates,
  base: CurrencyCode,
  month: string,
  monthsBack = 6,
): SpendAnomaly[] {
  const RATIO = 1.8 // 80%+ above the usual monthly spend
  const FLOOR = 50000 // and at least ~500 base units of overage (ignore noise)

  const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const curOf = (id?: string) => (id ? accCur.get(id) ?? base : base)

  const priorSet = new Set<string>()
  for (let i = monthsBack; i >= 1; i--) priorSet.add(addMonths(month, -i))

  const activePrior = new Set<string>()
  const catMonth = new Map<string, Map<string, number>>() // catId -> month -> total
  const currentByCat = new Map<string, number>()

  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const m = t.date.slice(0, 7)
    const val = toBase(t.amount, curOf(t.accountId), rates)
    const cat = t.categoryId ?? ''
    if (m === month) {
      currentByCat.set(cat, (currentByCat.get(cat) ?? 0) + val)
    } else if (priorSet.has(m)) {
      activePrior.add(m)
      let byMonth = catMonth.get(cat)
      if (!byMonth) {
        byMonth = new Map()
        catMonth.set(cat, byMonth)
      }
      byMonth.set(m, (byMonth.get(m) ?? 0) + val)
    }
  }

  const activeCount = activePrior.size
  if (activeCount === 0) return []

  const anomalies: SpendAnomaly[] = []
  for (const [cat, current] of currentByCat) {
    const byMonth = catMonth.get(cat)
    if (!byMonth) continue // no prior history for this category
    let sum = 0
    for (const m of activePrior) sum += byMonth.get(m) ?? 0
    const avg = sum / activeCount
    if (avg <= 0) continue
    if (current >= RATIO * avg && current - avg >= FLOOR) {
      anomalies.push({
        name: cat ? catName.get(cat) ?? 'Без категорії' : 'Без категорії',
        current: Math.round(current),
        avg: Math.round(avg),
        ratio: current / avg,
      })
    }
  }
  return anomalies.sort((a, b) => b.ratio - a.ratio).slice(0, 3)
}
