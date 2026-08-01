import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { usePlanning } from '../state/PlanningContext'
import { useSettings } from '../state/SettingsContext'
import { useSavingsGoals } from '../state/SavingsGoalsContext'
import { currentMonth } from '../utils/month'
import { formatMoney } from '../utils/money'
import { toBase } from '../utils/rates'
import { buildSavingsSummary } from '../calculations/savings'
import { getCurrency } from '../constants/currencies'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { KpiCard } from '../components/finance/KpiCard'
import { SavingsGoalModal } from '../components/finance/SavingsGoalModal'
import type { SavingsGoal } from '../types/savings'

const CURRENCY_COLORS: Record<string, string> = {
  UAH: '#4ade80',
  USD: '#38bdf8',
  EUR: '#a78bfa',
}

export function SavingsPage() {
  const { loading: dataLoading, accounts, transactions, balances } = useData()
  const { loading: planLoading, itemsForMonth } = usePlanning()
  const { settings, updateSettings } = useSettings()
  const { loading: goalsLoading, goals, deleteGoal } = useSavingsGoals()
  const base = settings.baseCurrency
  const rates = settings.exchangeRates
  const loading = dataLoading || planLoading || goalsLoading

  const [goalModal, setGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null)

  const month = currentMonth()
  const planItems = itemsForMonth(month)
  const monthlyExpense = useMemo(() => {
    const planned = planItems
      .filter((i) => i.kind === 'expense')
      .reduce((s, i) => s + i.amount, 0)
    if (planned > 0) return planned
    const accCur = new Map(accounts.map((a) => [a.id, a.currency]))
    return transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(`${month}-`))
      .reduce((s, t) => s + toBase(t.amount, accCur.get(t.accountId ?? '') ?? base, rates), 0)
  }, [planItems, transactions, accounts, month, base, rates])

  const summary = useMemo(
    () =>
      buildSavingsSummary(
        accounts,
        balances,
        rates,
        settings.emergencyTargetMonths,
        monthlyExpense,
        goals,
      ),
    [accounts, balances, rates, settings.emergencyTargetMonths, monthlyExpense, goals],
  )

  const money = (m: number, cur = base) => formatMoney(m, cur)

  if (loading) return <div className="page__loading">Завантаження…</div>

  if (accounts.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="wallet"
          title="Ще немає рахунків"
          description="Додайте рахунки (зокрема ощадні та у валюті) на дашборді — тут зʼявиться структура заощаджень, фінансова подушка та цілі."
        />
      </div>
    )
  }

  return (
    <div className="page">
      {/* Currency allocation */}
      <section className="section">
        <h2 className="section__title">Валютна структура</h2>
        <div className="alloc">
          <div className="alloc__bar">
            {summary.allocation.map((a) => (
              <div
                key={a.currency}
                className="alloc__seg"
                style={{ width: `${a.pct}%`, background: CURRENCY_COLORS[a.currency] }}
                title={`${a.currency} ${a.pct.toFixed(0)}%`}
              />
            ))}
          </div>
          <ul className="alloc__legend">
            {summary.allocation.map((a) => (
              <li key={a.currency}>
                <i className="dot" style={{ background: CURRENCY_COLORS[a.currency] }} />
                <span className="alloc__cur">
                  {getCurrency(a.currency).symbol} {a.currency}
                </span>
                <span className="alloc__amt">{money(a.amount, a.currency)}</span>
                <span className="alloc__pct">{a.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
          <p className="section__hint">
            Разом у базовій валюті: <strong>{money(summary.totalBase)}</strong>
          </p>
        </div>
      </section>

      {/* Emergency fund */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Фінансова подушка</h2>
          <div className="target-months">
            <span>Ціль:</span>
            <select
              className="field__input field__select target-months__select"
              value={settings.emergencyTargetMonths}
              onChange={(e) => updateSettings({ emergencyTargetMonths: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 6, 9, 12].map((m) => (
                <option key={m} value={m}>
                  {m} міс.
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="kpi-row kpi-row--3">
          <KpiCard label="Ощадні кошти" value={money(summary.emergencyFundBase)} tone="income" />
          <KpiCard label="Витрати за місяць" value={money(summary.monthlyExpense)} />
          <KpiCard
            label="Покриття"
            value={`${summary.coverageMonths.toFixed(1)} міс.`}
            tone={summary.coverageMonths >= summary.targetMonths ? 'income' : 'default'}
          />
        </div>
        <div className="goal-progress">
          <div className="budget-bar">
            <div
              className="budget-bar__fill budget-bar__fill--on-track"
              style={{ width: `${summary.coveragePct}%` }}
            />
          </div>
          <span className="goal-progress__label">
            {summary.coveragePct.toFixed(0)}% від цілі ({summary.targetMonths} міс.)
          </span>
        </div>
        {summary.monthlyExpense === 0 && (
          <p className="section__hint">
            Додайте планові витрати або витрати за цей місяць, щоб оцінити покриття подушки.
          </p>
        )}
      </section>

      {/* Savings goals */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Цілі заощаджень</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setEditingGoal(null)
              setGoalModal(true)
            }}
          >
            <Icon name="plus" size={16} /> Ціль
          </Button>
        </div>
        {summary.goals.length === 0 ? (
          <p className="section__empty">
            Ще немає цілей. Додайте, напр., «Відпустка» чи «Нова техніка».
          </p>
        ) : (
          <ul className="goal-list">
            {summary.goals.map((g) => (
              <li key={g.goal.id} className="goal-card">
                <div className="goal-card__head">
                  <span className="goal-card__name">{g.goal.name}</span>
                  <span className="goal-card__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Редагувати ціль ${g.goal.name}`}
                      onClick={() => {
                        setEditingGoal(g.goal)
                        setGoalModal(true)
                      }}
                    >
                      <Icon name="settings" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`Видалити ціль ${g.goal.name}`}
                      onClick={() => setDeletingGoal(g.goal)}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </span>
                </div>
                <div className="budget-bar">
                  <div
                    className="budget-bar__fill budget-bar__fill--on-track"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
                <div className="goal-card__foot">
                  <span>
                    {money(g.goal.saved, g.goal.currency)} / {money(g.goal.target, g.goal.currency)}
                  </span>
                  <span className="dev dev--pos">{g.pct.toFixed(0)}%</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SavingsGoalModal
        open={goalModal}
        goal={editingGoal}
        onClose={() => {
          setGoalModal(false)
          setEditingGoal(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingGoal)}
        title="Видалити ціль?"
        message={`Ціль «${deletingGoal?.name}» буде видалено.`}
        confirmLabel="Видалити"
        danger
        onCancel={() => setDeletingGoal(null)}
        onConfirm={async () => {
          if (deletingGoal) await deleteGoal(deletingGoal.id)
          setDeletingGoal(null)
        }}
      />
    </div>
  )
}
