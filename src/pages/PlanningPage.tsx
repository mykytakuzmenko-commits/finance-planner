import { useEffect, useMemo, useState } from 'react'
import { usePlanning } from '../state/PlanningContext'
import { useData } from '../state/DataContext'
import { useSettings } from '../state/SettingsContext'
import { currentMonth } from '../utils/month'
import { formatMoney } from '../utils/money'
import { summarizePlan } from '../calculations/planning'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Modal } from '../components/ui/Modal'
import { KpiCard } from '../components/finance/KpiCard'
import { MonthSwitcher } from '../components/finance/MonthSwitcher'
import { PlanItemFormModal } from '../components/finance/PlanItemFormModal'
import type { PlanItem, PlanKind } from '../types/planning'

export function PlanningPage() {
  const { loading, itemsForMonth, ensureMonth, deleteItem } = usePlanning()
  const { categories } = useData()
  const { settings } = useSettings()
  const currency = settings.baseCurrency

  const [month, setMonth] = useState(currentMonth())
  const [formOpen, setFormOpen] = useState(false)
  const [formKind, setFormKind] = useState<PlanKind>('expense')
  const [editing, setEditing] = useState<PlanItem | null>(null)
  const [deleting, setDeleting] = useState<PlanItem | null>(null)

  useEffect(() => {
    void ensureMonth(month)
  }, [month, ensureMonth])

  const items = itemsForMonth(month)
  const income = items.filter((i) => i.kind === 'income')
  const expenses = items.filter((i) => i.kind === 'expense')
  const summary = useMemo(() => summarizePlan(items), [items])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id?: string) => (id ? map.get(id) ?? 'Без категорії' : 'Без категорії')
  }, [categories])

  const openNew = (kind: PlanKind) => {
    setFormKind(kind)
    setEditing(null)
    setFormOpen(true)
  }

  const renderList = (list: PlanItem[]) =>
    list
      .slice()
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((i) => {
        const recurring = Boolean(i.templateId)
        const showProb = i.kind === 'income' && i.probability !== undefined && i.probability < 100
        return (
          <li key={i.id} className="plan-row">
            <button
              type="button"
              className="plan-row__main"
              onClick={() => {
                setEditing(i)
                setFormOpen(true)
              }}
            >
              <span className="plan-row__text">
                <span className="plan-row__title">
                  {i.name}
                  {recurring ? (
                    <span className="plan-tag" title="Регулярна">↻</span>
                  ) : (
                    <span className="plan-tag plan-tag--once" title="Одноразова">1×</span>
                  )}
                  {showProb && <span className="plan-prob">{i.probability}%</span>}
                </span>
                <span className="plan-row__subtitle">{categoryName(i.categoryId)}</span>
              </span>
              <span className={`plan-row__amount plan-row__amount--${i.kind}`}>
                {formatMoney(i.amount, currency)}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label="Видалити планову позицію"
              onClick={() => setDeleting(i)}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        )
      })

  if (loading) {
    return <div className="page__loading">Завантаження…</div>
  }

  return (
    <div className="page">
      <MonthSwitcher month={month} onChange={setMonth} />

      <div className="kpi-row">
        <KpiCard
          label="Планові доходи"
          value={formatMoney(summary.incomeFull, currency)}
          tone="income"
        />
        <KpiCard
          label="Планові витрати"
          value={formatMoney(summary.expense, currency)}
          tone="expense"
        />
        <KpiCard
          label="Плановий баланс"
          value={formatMoney(summary.balanceFull, currency)}
        />
      </div>

      {summary.incomeWeighted !== summary.incomeFull && (
        <p className="plan-weighted-note">
          З урахуванням ймовірностей: доходи{' '}
          <strong>{formatMoney(summary.incomeWeighted, currency)}</strong>, баланс{' '}
          <strong>{formatMoney(summary.balanceWeighted, currency)}</strong>.
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="planning"
          title="План на місяць порожній"
          description="Додайте планові доходи (зарплата, аванс, бонус) і витрати. Регулярні позиції автоматично зʼявляться в наступних місяцях."
          action={
            <div className="empty-actions">
              <Button onClick={() => openNew('income')}>
                <Icon name="plus" size={16} /> Дохід
              </Button>
              <Button variant="secondary" onClick={() => openNew('expense')}>
                <Icon name="plus" size={16} /> Витрата
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Планові доходи</h2>
              <Button variant="secondary" onClick={() => openNew('income')}>
                <Icon name="plus" size={16} /> Дохід
              </Button>
            </div>
            {income.length === 0 ? (
              <p className="section__empty">Планових доходів ще немає.</p>
            ) : (
              <ul className="plan-list">{renderList(income)}</ul>
            )}
          </section>

          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Планові витрати</h2>
              <Button variant="secondary" onClick={() => openNew('expense')}>
                <Icon name="plus" size={16} /> Витрата
              </Button>
            </div>
            {expenses.length === 0 ? (
              <p className="section__empty">Планових витрат ще немає.</p>
            ) : (
              <ul className="plan-list">{renderList(expenses)}</ul>
            )}
          </section>
        </>
      )}

      <PlanItemFormModal
        open={formOpen}
        month={month}
        defaultKind={formKind}
        item={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />

      <Modal
        open={Boolean(deleting)}
        title="Видалити планову позицію?"
        onClose={() => setDeleting(null)}
        footer={
          deleting?.templateId ? (
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Скасувати
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  if (deleting) await deleteItem(deleting, 'single')
                  setDeleting(null)
                }}
              >
                Лише цей місяць
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (deleting) await deleteItem(deleting, 'future')
                  setDeleting(null)
                }}
              >
                Цей і наступні
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Скасувати
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (deleting) await deleteItem(deleting, 'single')
                  setDeleting(null)
                }}
              >
                Видалити
              </Button>
            </>
          )
        }
      >
        <p>
          {deleting?.templateId
            ? 'Це регулярна позиція. Видалити лише в цьому місяці чи припинити її й у наступних місяцях?'
            : 'Планову позицію буде видалено.'}
        </p>
      </Modal>
    </div>
  )
}
