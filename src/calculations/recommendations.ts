import type { CurrencyCode } from '../types/settings'
import type { Recommendation } from '../types/recommendation'
import type { DashboardForecast } from './forecast'

export interface RecoGoal {
  name: string
  currency: CurrencyCode
  remaining: number // in the goal's currency
  remainingBase: number // converted to base
  isForeign: boolean
}

export interface RecoContext {
  base: CurrencyCode
  hasAccounts: boolean
  hasPlan: boolean
  forecast: DashboardForecast
  /** Overspent expense categories (base minor units), most over first. */
  overspent: { name: string; over: number }[]
  /** Categories spending far above their own typical level this month. */
  anomalies: { name: string; current: number; avg: number; ratio: number }[]
  emergency: {
    coverageMonths: number
    targetMonths: number
    monthlyExpense: number
    shortfallBase: number
  }
  goals: RecoGoal[]
  weekly?: { hasBudget: boolean; overspend: number }
  /** Money that could be redirected to savings/goals without breaking the plan. */
  allocatableBase: number
}

/**
 * Convert cautious, rule-based signals over the user's OWN data into a limited,
 * explainable set of recommendations. This is deliberately conservative — it
 * never suggests borrowing, leverage, specific instruments, market timing, or
 * converting everything at once. It is not investment advice.
 */
export function buildRecommendations(ctx: RecoContext): Recommendation[] {
  const recs: Recommendation[] = []
  const push = (r: Omit<Recommendation, 'id'>) =>
    recs.push({ ...r, id: `${r.category}-${recs.length}` })

  if (!ctx.hasAccounts) return recs

  const f = ctx.forecast

  // --- Personal signals from actual data (highest priority) ---

  if (f.deficit > 0) {
    push({
      title: 'Прогнозується дефіцит',
      reason:
        'Навіть за гарантованими доходами прогнозованих коштів бракує на заплановані витрати цього місяця.',
      action: 'Скоротіть необовʼязкові витрати або відкладіть великі покупки.',
      amount: f.deficit,
      confidence: 'high',
      category: 'cashflow',
      severity: 100,
    })
  } else if (f.safeToSpend < 0) {
    push({
      title: 'Ризик не досягти заощаджень',
      reason:
        'Поточні прогнози показують, що додаткові витрати можуть зʼїсти заплановані заощадження.',
      action: 'Стримайте необовʼязкові витрати до кінця місяця.',
      amount: -f.safeToSpend,
      confidence: 'high',
      category: 'cashflow',
      severity: 90,
    })
  }

  for (const a of ctx.anomalies.slice(0, 3)) {
    push({
      title: `Незвична витрата: «${a.name}»`,
      reason: `Цього місяця на «${a.name}» уже витрачено ${fmtHint(a.current)} — це ×${a.ratio.toFixed(1)} від звичного (${fmtHint(a.avg)}).`,
      action: 'Перегляньте операції в цій категорії — можливо, разова велика витрата.',
      confidence: a.ratio >= 2.5 ? 'high' : 'medium',
      category: 'anomaly',
      severity: 85,
    })
  }

  for (const c of ctx.overspent.slice(0, 2)) {
    push({
      title: `Перевитрата: «${c.name}»`,
      reason: `Фактичні витрати в цій категорії перевищили план на ${fmtHint(c.over)}.`,
      action: 'Перегляньте витрати в цій категорії до кінця місяця.',
      amount: c.over,
      confidence: 'high',
      category: 'budget',
      severity: 80,
    })
  }

  if (ctx.weekly?.hasBudget && ctx.weekly.overspend > 0) {
    push({
      title: 'Тиждень: перевитрата',
      reason: 'Цього тижня витрати вже перевищили тижневий бюджет.',
      action: 'Пригальмуйте змінні витрати до кінця тижня.',
      amount: ctx.weekly.overspend,
      confidence: 'medium',
      category: 'budget',
      severity: 70,
    })
  }

  // --- Emergency fund ---
  if (
    ctx.emergency.monthlyExpense > 0 &&
    ctx.emergency.coverageMonths < ctx.emergency.targetMonths &&
    ctx.emergency.shortfallBase > 0
  ) {
    push({
      title: 'Подушку варто поповнити',
      reason: `Зараз подушка покриває ${ctx.emergency.coverageMonths.toFixed(1)} міс. із цільових ${ctx.emergency.targetMonths}.`,
      action:
        'Розгляньте поступове поповнення ощадних рахунків — не обовʼязково одразу всю суму.',
      amount: ctx.emergency.shortfallBase,
      confidence: 'medium',
      category: 'savings',
      severity: 55,
    })
  }

  // --- Opportunities (only when there is real surplus) ---
  const surplus = ctx.allocatableBase
  const surplusMeaningful = surplus > Math.max(0, ctx.emergency.monthlyExpense * 0.1)

  if (surplusMeaningful && ctx.emergency.coverageMonths < ctx.emergency.targetMonths) {
    push({
      title: 'Є вільні кошти для заощаджень',
      reason: `Прогнозується вільний залишок близько ${fmtHint(surplus)}.`,
      action: 'Можна спрямувати частину у подушку — орієнтовно 20–40%.',
      range: [Math.round(surplus * 0.2), Math.round(surplus * 0.4)],
      confidence: 'medium',
      category: 'savings',
      severity: 45,
    })
  }

  // Currency goal: cautious, partial, gradual conversion toward a stated goal.
  const foreignGoal = ctx.goals.find((g) => g.isForeign && g.remaining > 0)
  if (foreignGoal && surplus > 0) {
    // Cap at 25% of the smaller of (surplus, remaining need) — never "all at once".
    const capBase = Math.round(Math.min(surplus, foreignGoal.remainingBase) * 0.25)
    if (capBase > 0) {
      push({
        title: `Крок до цілі «${foreignGoal.name}»`,
        reason: `Ціль у ${foreignGoal.currency}, залишок ${fmtHint(foreignGoal.remaining)} ${foreignGoal.currency}. У вас є вільні кошти.`,
        action: `Можна поступово конвертувати ЧАСТИНУ — орієнтовно до цієї суми за раз, за поточним курсом. Не конвертуйте все одразу: курс може змінюватися.`,
        amount: capBase,
        confidence: 'low',
        category: 'currency',
        severity: 40,
      })
    }
  }

  // --- Positive reinforcement (only if nothing urgent) ---
  const hasUrgent = recs.some((r) => r.severity >= 55)
  if (
    !hasUrgent &&
    f.deficit === 0 &&
    f.safeToSpend >= 0 &&
    ctx.overspent.length === 0 &&
    ctx.emergency.coverageMonths >= ctx.emergency.targetMonths
  ) {
    push({
      title: 'Фінанси у гарному стані',
      reason: 'Подушка сформована, витрати в межах плану, дефіциту немає.',
      action: 'Розгляньте, куди спрямувати надлишок — на власні цілі чи резерв (на ваш розсуд).',
      confidence: 'low',
      category: 'positive',
      severity: 10,
    })
  }

  recs.sort((a, b) => b.severity - a.severity)
  return recs.slice(0, 6)
}

// Small helper so the engine stays currency-format agnostic (UI formats amounts).
function fmtHint(minor: number): string {
  return (Math.abs(minor) / 100).toLocaleString('uk-UA', { maximumFractionDigits: 2 })
}
