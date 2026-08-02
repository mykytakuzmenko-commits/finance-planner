import { useMemo } from 'react'
import { useAuth } from '../state/AuthContext'
import { useData } from '../state/DataContext'
import { usePlanning } from '../state/PlanningContext'
import { useSettings } from '../state/SettingsContext'
import { useSavingsGoals } from '../state/SavingsGoalsContext'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { formatMoney } from '../utils/money'
import { formatDate } from '../utils/date'
import { toBase } from '../utils/rates'
import { currentMonth } from '../utils/month'
import { todayISO } from '../utils/date'
import { buildForecast } from '../calculations/forecast'
import { buildSavingsSummary } from '../calculations/savings'
import { buildPlanFact } from '../calculations/planFact'
import { buildProfile } from '../calculations/profile'
import { buildNetWorth } from '../calculations/netWorth'
import { NetWorthCard } from '../components/finance/NetWorthCard'

function scoreTone(score: number): string {
  if (score >= 80) return 'good'
  if (score >= 60) return 'ok'
  if (score >= 40) return 'warn'
  return 'bad'
}

export function ProfilePage() {
  const { session, signOut } = useAuth()
  const { accounts, categories, transactions, balances } = useData()
  const { itemsForMonth } = usePlanning()
  const { settings } = useSettings()
  const { goals } = useSavingsGoals()

  const base = settings.baseCurrency
  const rates = settings.exchangeRates
  const month = currentMonth()
  const today = todayISO()
  const planItems = itemsForMonth(month)
  const money = (m: number) => formatMoney(m, base)

  const profile = useMemo(() => {
    const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
    const curOf = (id?: string) => (id ? accCur.get(id) ?? base : base)
    const currentBalanceBase = accounts.reduce(
      (s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates),
      0,
    )
    const monthTxBase = transactions
      .filter((t) => t.date.startsWith(`${month}-`))
      .map((t) => ({ ...t, amount: toBase(t.amount, curOf(t.accountId), rates) }))
    const forecast = buildForecast(currentBalanceBase, monthTxBase, planItems)

    const plannedExpense = planItems
      .filter((i) => i.kind === 'expense')
      .reduce((s, i) => s + i.amount, 0)
    const actualExpenseBase = monthTxBase
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const monthlyExpense = plannedExpense > 0 ? plannedExpense : actualExpenseBase
    const savings = buildSavingsSummary(
      accounts,
      balances,
      rates,
      settings.emergencyTargetMonths,
      monthlyExpense,
      goals,
    )

    const fact = buildPlanFact(month, planItems, transactions, categories, today)
    const expCats = fact.categories.filter((c) => c.kind === 'expense' && c.planned > 0)
    const discipline = expCats.length
      ? { planned: expCats.length, withinPlan: expCats.filter((c) => c.status !== 'overspent').length }
      : null

    return buildProfile({ transactions, categories, accounts, rates, base, savings, forecast, goals, discipline })
  }, [transactions, categories, accounts, balances, rates, base, planItems, goals, settings.emergencyTargetMonths, month, today])

  const netWorth = useMemo(
    () => buildNetWorth(accounts, balances, transactions, rates, month),
    [accounts, balances, transactions, rates, month],
  )

  const email = session?.user.email ?? ''
  const initials = (email.slice(0, 2) || '👤').toUpperCase()
  const created = session?.user.created_at
  const memberSince = created ? formatDate(created.slice(0, 10)) : null

  const { health, achievements, lifetime } = profile
  const earnedCount = achievements.filter((a) => a.earned).length

  return (
    <div className="page">
      {/* Identity */}
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <div className="profile-id">
          <span className="profile-email">{email}</span>
          {memberSince && <span className="profile-since">З нами з {memberSince}</span>}
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>
          <Icon name="close" size={16} /> Вийти
        </Button>
      </section>

      {/* Net worth */}
      <NetWorthCard netWorth={netWorth} currency={base} />

      {/* Financial health */}
      <section className="section-card">
        <h2 className="section__title">Фінансове здоровʼя</h2>
        <div className="health">
          <div className={`health-score health-score--${scoreTone(health.score)}`}>
            <span className="health-score__num">{health.score}</span>
            <span className="health-score__max">/100</span>
            <span className="health-score__tier">{health.tier}</span>
          </div>
          <div className="health-metrics">
            {health.metrics.map((m) => (
              <div key={m.key} className="health-metric">
                <div className="health-metric__top">
                  <span>{m.label}</span>
                  <span className="health-metric__detail">{m.detail}</span>
                </div>
                <div className="health-bar">
                  <div
                    className={`health-bar__fill health-bar__fill--${scoreTone(m.score)}`}
                    style={{ width: `${m.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="section-card">
        <div className="section__head">
          <h2 className="section__title">Досягнення</h2>
          <span className="badges__count">{earnedCount} / {achievements.length}</span>
        </div>
        <div className="badges">
          {achievements.map((a) => (
            <div key={a.id} className={`badge ${a.earned ? 'badge--earned' : 'badge--locked'}`}>
              <span className="badge__emoji">{a.earned ? a.emoji : '🔒'}</span>
              <span className="badge__title">{a.title}</span>
              <span className="badge__desc">{a.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Lifetime summary */}
      <section className="section-card">
        <h2 className="section__title">Підсумок за весь час</h2>
        <div className="life-stats">
          <div className="life-stat">
            <span className="life-stat__label">Місяців обліку</span>
            <span className="life-stat__value">{lifetime.monthsTracked}</span>
          </div>
          <div className="life-stat">
            <span className="life-stat__label">Сер. норма заощаджень</span>
            <span className="life-stat__value">{lifetime.avgSavingsRatePct}%</span>
          </div>
          <div className="life-stat">
            <span className="life-stat__label">Усього доходів</span>
            <span className="life-stat__value pos">{money(lifetime.totalIncome)}</span>
          </div>
          <div className="life-stat">
            <span className="life-stat__label">Усього витрат</span>
            <span className="life-stat__value neg">{money(lifetime.totalExpense)}</span>
          </div>
          {lifetime.bestMonthLabel && (
            <div className="life-stat">
              <span className="life-stat__label">Найкращий місяць</span>
              <span className="life-stat__value">{lifetime.bestMonthLabel}</span>
              <span className="life-stat__sub pos">{money(lifetime.bestMonthNet)}</span>
            </div>
          )}
          {lifetime.topCategoryName && (
            <div className="life-stat">
              <span className="life-stat__label">Топ-категорія витрат</span>
              <span className="life-stat__value">{lifetime.topCategoryName}</span>
              <span className="life-stat__sub">{money(lifetime.topCategoryTotal)}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
