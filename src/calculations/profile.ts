import type { Account, Category, Transaction } from '../types/finance'
import type { CurrencyCode } from '../types/settings'
import type { SavingsGoal } from '../types/savings'
import type { DashboardForecast } from './forecast'
import type { SavingsSummary } from './savings'
import { toBase, type ExchangeRates } from '../utils/rates'
import { formatMonth } from '../utils/month'

export interface HealthMetric {
  key: string
  label: string
  score: number // 0–100
  detail: string
}
export interface FinancialHealth {
  score: number
  tier: string
  metrics: HealthMetric[]
}
export interface Achievement {
  id: string
  emoji: string
  title: string
  desc: string
  earned: boolean
}
export interface LifetimeStats {
  monthsTracked: number
  totalIncome: number
  totalExpense: number
  avgSavingsRatePct: number
  bestMonthLabel: string | null
  bestMonthNet: number
  topCategoryName: string | null
  topCategoryTotal: number
}
export interface ProfileData {
  health: FinancialHealth
  achievements: Achievement[]
  lifetime: LifetimeStats
}

export interface ProfileInput {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  rates: ExchangeRates
  base: CurrencyCode
  savings: SavingsSummary
  forecast: DashboardForecast
  goals: SavingsGoal[]
  /** Budget discipline this month; null when there is no plan. */
  discipline: { planned: number; withinPlan: number } | null
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function buildProfile(input: ProfileInput): ProfileData {
  const { transactions, categories, accounts, rates, base, savings, forecast, goals, discipline } =
    input
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const curOf = (id?: string) => (id ? accCur.get(id) ?? base : base)

  // ---- Lifetime aggregation (all months) ----
  const monthly = new Map<string, { income: number; expense: number }>()
  const catTotals = new Map<string, number>()
  let totalIncome = 0
  let totalExpense = 0
  for (const t of transactions) {
    if (t.type !== 'income' && t.type !== 'expense') continue
    const m = t.date.slice(0, 7)
    const val = toBase(t.amount, curOf(t.accountId), rates)
    const agg = monthly.get(m) ?? { income: 0, expense: 0 }
    if (t.type === 'income') {
      agg.income += val
      totalIncome += val
    } else {
      agg.expense += val
      totalExpense += val
      const k = t.categoryId ?? ''
      catTotals.set(k, (catTotals.get(k) ?? 0) + val)
    }
    monthly.set(m, agg)
  }

  const months = [...monthly.keys()].sort()
  const rateSamples = months
    .map((m) => monthly.get(m)!)
    .filter((a) => a.income > 0)
    .map((a) => (a.income - a.expense) / a.income)
  const avgSavingsRatePct = rateSamples.length
    ? Math.round((rateSamples.reduce((s, x) => s + x, 0) / rateSamples.length) * 100)
    : 0

  let bestMonthLabel: string | null = null
  let bestMonthNet = months.length ? -Infinity : 0
  for (const m of months) {
    const a = monthly.get(m)!
    const net = a.income - a.expense
    if (net > bestMonthNet) {
      bestMonthNet = net
      bestMonthLabel = formatMonth(m)
    }
  }

  let topCategoryName: string | null = null
  let topCategoryTotal = 0
  for (const [k, v] of catTotals) {
    if (v > topCategoryTotal) {
      topCategoryTotal = v
      topCategoryName = k ? catName.get(k) ?? 'Без категорії' : 'Без категорії'
    }
  }

  const lifetime: LifetimeStats = {
    monthsTracked: months.length,
    totalIncome,
    totalExpense,
    avgSavingsRatePct,
    bestMonthLabel,
    bestMonthNet,
    topCategoryName,
    topCategoryTotal,
  }

  // ---- Financial health ----
  const metrics: HealthMetric[] = [
    {
      key: 'savings',
      label: 'Норма заощаджень',
      score: clamp100((avgSavingsRatePct / 20) * 100), // 20%+ → full
      detail: `${avgSavingsRatePct}% доходу`,
    },
    {
      key: 'cushion',
      label: 'Подушка безпеки',
      score: clamp100(savings.coveragePct),
      detail: `${savings.coverageMonths.toFixed(1)} з ${savings.targetMonths} міс.`,
    },
    {
      key: 'cashflow',
      label: 'Безпека потоку',
      score: forecast.deficit > 0 ? 20 : forecast.safeToSpend < 0 ? 60 : 95,
      detail:
        forecast.deficit > 0
          ? 'прогнозується дефіцит'
          : forecast.safeToSpend < 0
            ? 'мало вільних коштів'
            : 'під контролем',
    },
  ]
  if (discipline && discipline.planned > 0) {
    metrics.push({
      key: 'discipline',
      label: 'Дисципліна бюджету',
      score: clamp100((discipline.withinPlan / discipline.planned) * 100),
      detail: `${discipline.withinPlan}/${discipline.planned} категорій у межах`,
    })
  }
  const score = Math.round(metrics.reduce((s, m) => s + m.score, 0) / metrics.length)
  const tier = score >= 80 ? 'Відмінно' : score >= 60 ? 'Добре' : score >= 40 ? 'Непогано' : 'Є куди рости'
  const health: FinancialHealth = { score, tier, metrics }

  // ---- Achievements ----
  const lastThree = months.slice(-3).map((m) => monthly.get(m)!)
  const positiveStreak = lastThree.length === 3 && lastThree.every((a) => a.income - a.expense > 0)
  const goalReached = goals.some((g) => g.target > 0 && g.saved >= g.target)
  const achievements: Achievement[] = [
    { id: 'track3', emoji: '📆', title: 'Стабільний облік', desc: 'Вести облік ≥ 3 місяці', earned: months.length >= 3 },
    { id: 'track6', emoji: '🗓️', title: 'Пів року з нами', desc: 'Вести облік ≥ 6 місяців', earned: months.length >= 6 },
    { id: 'cushion10k', emoji: '💰', title: 'Перші 10 000', desc: 'Накопичити 10 000 у подушці', earned: savings.savingsBase >= 1_000_000 },
    { id: 'cushion3m', emoji: '🛡️', title: 'Подушка на 3 місяці', desc: 'Резерв покриває ≥ 3 міс. витрат', earned: savings.coverageMonths >= 3 },
    { id: 'nodeficit', emoji: '✅', title: 'Без дефіциту', desc: 'Прогноз місяця без дефіциту', earned: forecast.deficit === 0 },
    { id: 'streak', emoji: '📈', title: 'Стабільний плюс', desc: '3 місяці поспіль у плюсі', earned: positiveStreak },
    { id: 'goal', emoji: '🎯', title: 'Ціль досягнута', desc: 'Досягти будь-якої цілі заощаджень', earned: goalReached },
  ]

  return { health, achievements, lifetime }
}
