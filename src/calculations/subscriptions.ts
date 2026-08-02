import type { Account, Category, Transaction } from '../types/finance'
import type { CurrencyCode } from '../types/settings'
import { toBase, type ExchangeRates } from '../utils/rates'
import { addMonths } from '../utils/month'
import { addDays, daysBetween } from '../utils/date'

export type SubCadence = 'monthly' | 'quarterly' | 'yearly'

export interface Subscription {
  id: string
  /** Display name — a shared note if consistent, otherwise the category. */
  label: string
  categoryName: string
  /** Representative amount per charge, base minor units. */
  amount: number
  cadence: SubCadence
  /** Amount normalized to a monthly figure, base minor units. */
  monthlyEquivalent: number
  count: number
  lastDate: string
  nextDate: string
  confidence: 'high' | 'medium'
}

interface Item {
  cat: string
  amount: number
  date: string
  note: string
}

const TOL = 0.05 // ±5% amount tolerance within one subscription
const CADENCE_RULES: {
  cadence: SubCadence
  min: number
  max: number
  perMonth: number
}[] = [
  { cadence: 'monthly', min: 24, max: 38, perMonth: 1 },
  { cadence: 'quarterly', min: 80, max: 100, perMonth: 1 / 3 },
  { cadence: 'yearly', min: 330, max: 400, perMonth: 1 / 12 },
]

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Find expenses that look like recurring subscriptions / regular payments:
 * a stable amount (±5%) in the same category, charged on a recognizable
 * monthly / quarterly / yearly cadence across at least two different months.
 * Deliberately conservative — it labels these "regular payments", not proof.
 */
export function detectSubscriptions(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  rates: ExchangeRates,
  base: CurrencyCode,
  asOfMonth: string,
  monthsBack = 12,
): Subscription[] {
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const curOf = (id?: string) => (id ? accCur.get(id) ?? base : base)
  const nameOf = (cat: string) => (cat ? catName.get(cat) ?? 'Без категорії' : 'Без категорії')

  const earliest = addMonths(asOfMonth, -(monthsBack - 1))
  const byCat = new Map<string, Item[]>()
  for (const t of transactions) {
    if (t.type !== 'expense' || t.date.slice(0, 7) < earliest) continue
    const cat = t.categoryId ?? ''
    const arr = byCat.get(cat) ?? []
    arr.push({
      cat,
      amount: toBase(t.amount, curOf(t.accountId), rates),
      date: t.date,
      note: (t.note ?? '').trim(),
    })
    byCat.set(cat, arr)
  }

  const subs: Subscription[] = []

  const processCluster = (cat: string, cluster: Item[]) => {
    const months = new Set(cluster.map((c) => c.date.slice(0, 7)))
    if (cluster.length < 2 || months.size < 2) return

    const dates = cluster.map((c) => c.date).sort()
    const gaps: number[] = []
    for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]))
    const gap = median(gaps.filter((g) => g > 0))
    if (!Number.isFinite(gap) || gap <= 0) return

    const rule = CADENCE_RULES.find((r) => gap >= r.min && gap <= r.max)
    if (!rule) return

    const amount = Math.round(median(cluster.map((c) => c.amount)))
    const lastDate = dates[dates.length - 1]
    const notes = cluster.map((c) => c.note).filter(Boolean)
    const consistentNote =
      notes.length === cluster.length && new Set(notes.map((n) => n.toLowerCase())).size === 1
        ? notes[0]
        : ''

    subs.push({
      id: `${cat}:${amount}`,
      label: consistentNote || nameOf(cat),
      categoryName: nameOf(cat),
      amount,
      cadence: rule.cadence,
      monthlyEquivalent: Math.round(amount * rule.perMonth),
      count: cluster.length,
      lastDate,
      nextDate: addDays(lastDate, Math.round(gap)),
      confidence: cluster.length >= 3 ? 'high' : 'medium',
    })
  }

  for (const [cat, arr] of byCat) {
    // Greedily cluster by amount (sorted asc) within ±TOL of the cluster's low anchor.
    const sorted = [...arr].sort((a, b) => a.amount - b.amount)
    let cluster: Item[] = []
    let anchor = -1
    for (const it of sorted) {
      if (anchor < 0 || it.amount <= anchor * (1 + TOL)) {
        if (anchor < 0) anchor = it.amount
        cluster.push(it)
      } else {
        processCluster(cat, cluster)
        cluster = [it]
        anchor = it.amount
      }
    }
    processCluster(cat, cluster)
  }

  return subs.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent).slice(0, 8)
}
