import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { useSettings } from '../state/SettingsContext'
import { useWeeklyBudget } from '../state/WeeklyBudgetContext'
import { currentWeekStart } from '../utils/week'
import { todayISO } from '../utils/date'
import { formatMoney } from '../utils/money'
import { buildWeeklyReport } from '../calculations/weekly'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { KpiCard } from '../components/finance/KpiCard'
import { WeekSwitcher } from '../components/finance/WeekSwitcher'
import { StatusBadge } from '../components/finance/StatusBadge'
import { WeeklyLimitModal } from '../components/finance/WeeklyLimitModal'
import type { WeeklyLimit } from '../types/weekly'

export function WeeklyPage() {
  const { loading: dataLoading, transactions, categories } = useData()
  const { loading: weekLoading, getBudget, deleteLimit } = useWeeklyBudget()
  const { settings } = useSettings()
  const currency = settings.baseCurrency
  const loading = dataLoading || weekLoading

  const [weekStart, setWeekStart] = useState(currentWeekStart())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WeeklyLimit | null>(null)
  const [deleting, setDeleting] = useState<WeeklyLimit | null>(null)

  const budget = getBudget(weekStart)
  const report = useMemo(
    () => buildWeeklyReport(weekStart, budget, transactions, categories, todayISO()),
    [weekStart, budget, transactions, categories],
  )
  const usedCategoryIds = report.lines.map((l) => l.categoryId)

  const money = (m: number) => formatMoney(m, currency)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  if (loading) return <div className="page__loading">Завантаження…</div>

  return (
    <div className="page">
      <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />

      {report.lines.length === 0 ? (
        <EmptyState
          icon="week"
          title="Тижневий бюджет не налаштований"
          description="Задайте ліміти витрат за категоріями на цей тиждень — фактичні операції автоматично враховуються, а застосунок покаже залишок і безпечну суму на день."
          action={
            <Button onClick={openAdd}>
              <Icon name="plus" size={16} /> Додати ліміт
            </Button>
          }
        />
      ) : (
        <>
          {report.overspend > 0 && (
            <div className="alert alert--danger">
              <strong>Перевитрата: {money(report.overspend)}.</strong> Витрати цього тижня
              перевищили бюджет.
            </div>
          )}

          <div className="kpi-row kpi-row--4">
            <KpiCard label="Бюджет тижня" value={money(report.totalLimit)} />
            <KpiCard label="Витрачено" value={money(report.totalSpent)} tone="expense" />
            <KpiCard
              label="Залишок"
              value={money(report.remaining)}
              tone={report.remaining < 0 ? 'expense' : 'income'}
            />
            <KpiCard label="Безпечно на день" value={money(report.dailySafe)} tone="income" />
          </div>

          {report.daysLeft > 0 ? (
            <p className="section__hint">
              До кінця тижня — {report.daysLeft}{' '}
              {report.daysLeft === 1 ? 'день' : report.daysLeft < 5 ? 'дні' : 'днів'}. «Безпечно
              на день» = залишок ÷ дні, що лишились.
            </p>
          ) : (
            <p className="section__hint">Тиждень завершено.</p>
          )}

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Ліміти за категоріями</h2>
              <Button variant="secondary" onClick={openAdd}>
                <Icon name="plus" size={16} /> Ліміт
              </Button>
            </div>
            <ul className="budget-list">
              {report.lines.map((l) => {
                const pct = l.limit > 0 ? Math.min(100, (l.spent / l.limit) * 100) : 0
                return (
                  <li key={l.limitId} className="budget-row">
                    <div className="budget-row__head">
                      <span className="budget-row__name">{l.categoryName}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <div className="budget-bar">
                      <div
                        className={`budget-bar__fill budget-bar__fill--${l.status}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="budget-row__foot">
                      <span>
                        {money(l.spent)} / {money(l.limit)}
                      </span>
                      <span className={l.remaining < 0 ? 'dev dev--neg' : 'dev dev--pos'}>
                        {l.remaining < 0
                          ? `перевитрата ${money(l.overspend)}`
                          : `залишок ${money(l.remaining)}`}
                      </span>
                      <span className="budget-row__actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Змінити ліміт ${l.categoryName}`}
                          onClick={() => {
                            setEditing({ id: l.limitId, categoryId: l.categoryId, limit: l.limit })
                            setModalOpen(true)
                          }}
                        >
                          <Icon name="settings" size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          aria-label={`Видалити ліміт ${l.categoryName}`}
                          onClick={() =>
                            setDeleting({ id: l.limitId, categoryId: l.categoryId, limit: l.limit })
                          }
                        >
                          <Icon name="close" size={15} />
                        </button>
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          {report.otherSpent > 0 && (
            <p className="section__hint">
              Інші витрати цього тижня (поза бюджетом): <strong>{money(report.otherSpent)}</strong>.
            </p>
          )}
        </>
      )}

      <WeeklyLimitModal
        open={modalOpen}
        weekStart={weekStart}
        editing={editing}
        usedCategoryIds={usedCategoryIds}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Видалити ліміт?"
        message="Ліміт для цієї категорії на цей тиждень буде видалено."
        confirmLabel="Видалити"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteLimit(weekStart, deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
