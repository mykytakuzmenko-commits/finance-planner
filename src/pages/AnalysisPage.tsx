import { useEffect, useMemo, useState } from 'react'
import { usePlanning } from '../state/PlanningContext'
import { useData } from '../state/DataContext'
import { useSettings } from '../state/SettingsContext'
import { currentMonth, formatMonth } from '../utils/month'
import { todayISO } from '../utils/date'
import { formatMoney } from '../utils/money'
import { buildPlanFact } from '../calculations/planFact'
import { closeMonth, getReport, reopenMonth, type MonthReport } from '../services/reports'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { MonthSwitcher } from '../components/finance/MonthSwitcher'
import { StatusBadge } from '../components/finance/StatusBadge'
import { PlanItemLinkModal } from '../components/finance/PlanItemLinkModal'
import type { PlanItem } from '../types/planning'

export function AnalysisPage() {
  const { loading: planLoading, itemsForMonth, ensureMonth } = usePlanning()
  const { loading: dataLoading, transactions, categories, accounts } = useData()
  const { settings } = useSettings()
  const currency = settings.baseCurrency
  const loading = planLoading || dataLoading

  const [month, setMonth] = useState(currentMonth())
  const [linkItem, setLinkItem] = useState<PlanItem | null>(null)
  const [closed, setClosed] = useState<MonthReport | null>(() => getReport(currentMonth()))

  useEffect(() => {
    if (!planLoading) void ensureMonth(month)
    setClosed(getReport(month))
  }, [month, planLoading, ensureMonth])

  const planItems = itemsForMonth(month)
  const fact = useMemo(
    () => buildPlanFact(month, planItems, transactions, categories, todayISO()),
    [month, planItems, transactions, categories],
  )

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]))
    return (id?: string) => (id ? map.get(id) ?? '—' : '—')
  }, [accounts])
  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id?: string) => (id ? map.get(id) ?? 'Без категорії' : 'Без категорії')
  }, [categories])

  const money = (m: number) => formatMoney(m, currency)
  const signed = (m: number) => `${m > 0 ? '+' : m < 0 ? '−' : ''}${money(Math.abs(m))}`
  const devClass = (m: number) =>
    m > 0 ? 'dev dev--pos' : m < 0 ? 'dev dev--neg' : 'dev'

  const buildReport = (): MonthReport => ({
    month,
    plannedIncome: fact.plannedIncome,
    actualIncome: fact.actualIncome,
    plannedExpense: fact.plannedExpense,
    actualExpense: fact.actualExpense,
    actualSavings: fact.actualIncome - fact.actualExpense,
    topCategories: fact.categories
      .filter((c) => c.kind === 'expense')
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 3)
      .map((c) => ({ name: c.categoryName, actual: c.actual })),
    closedAt: new Date().toISOString(),
  })

  const downloadReport = () => {
    const r = buildReport()
    const text = [
      `Звіт за ${formatMonth(month)}`,
      '',
      `Доходи:   план ${money(r.plannedIncome)} · факт ${money(r.actualIncome)}`,
      `Витрати:  план ${money(r.plannedExpense)} · факт ${money(r.actualExpense)}`,
      `Заощадження (факт): ${money(r.actualSavings)}`,
      '',
      'Топ витрат за категоріями:',
      ...r.topCategories.map((c) => `  • ${c.name}: ${money(c.actual)}`),
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${month}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const onCloseMonth = () => {
    const r = buildReport()
    closeMonth(r)
    setClosed(r)
  }
  const onReopenMonth = () => {
    reopenMonth(month)
    setClosed(null)
  }

  if (loading) return <div className="page__loading">Завантаження…</div>

  const nothingToShow =
    planItems.length === 0 && fact.actualIncome === 0 && fact.actualExpense === 0

  return (
    <div className="page">
      <MonthSwitcher month={month} onChange={setMonth} />

      {nothingToShow ? (
        <EmptyState
          icon="analysis"
          title="Немає даних для аналізу"
          description="Додайте план на цей місяць (розділ «Планування») та фактичні операції (розділ «Операції») — і тут зʼявиться порівняння план/факт."
        />
      ) : (
        <>
          {/* Monthly report & closing */}
          <section className="section">
            <div className="section__head">
              <h2 className="section__title">Звіт за місяць</h2>
              {closed && <span className="report-closed">Місяць закрито</span>}
            </div>
            <div className="report-actions">
              <Button variant="secondary" onClick={downloadReport}>
                Завантажити звіт (.txt)
              </Button>
              {closed ? (
                <Button variant="ghost" onClick={onReopenMonth}>
                  Відкрити місяць
                </Button>
              ) : (
                <Button onClick={onCloseMonth}>Закрити місяць</Button>
              )}
            </div>
            {closed && (
              <p className="section__hint">
                Підсумок збережено. Заощадження за місяць: {money(closed.actualSavings)}.
              </p>
            )}
          </section>

          {/* Overall plan vs fact */}
          <section className="section">
            <h2 className="section__title">Загалом за місяць</h2>
            <div className="compare-grid">
              <div className="compare">
                <span className="compare__label">Доходи</span>
                <div className="compare__nums">
                  <span>план {money(fact.plannedIncome)}</span>
                  <span>факт {money(fact.actualIncome)}</span>
                </div>
                <span className={devClass(fact.incomeDeviation)}>
                  Відхилення: {signed(fact.incomeDeviation)}
                </span>
              </div>
              <div className="compare">
                <span className="compare__label">Витрати</span>
                <div className="compare__nums">
                  <span>план {money(fact.plannedExpense)}</span>
                  <span>факт {money(fact.actualExpense)}</span>
                </div>
                <span className={devClass(fact.expenseDeviation)}>
                  {fact.expenseDeviation >= 0 ? 'Економія: ' : 'Перевитрата: '}
                  {signed(fact.expenseDeviation)}
                </span>
              </div>
            </div>
          </section>

          {/* Plan-to-date vs actual-to-date */}
          <section className="section">
            <h2 className="section__title">На сьогодні</h2>
            <p className="section__hint">
              Скільки мало статися до сьогодні за планом — і скільки фактично сталося.
            </p>
            <div className="compare-grid">
              <div className="compare">
                <span className="compare__label">Доходи (до сьогодні)</span>
                <div className="compare__nums">
                  <span>план {money(fact.plannedIncomeToDate)}</span>
                  <span>факт {money(fact.actualIncomeToDate)}</span>
                </div>
              </div>
              <div className="compare">
                <span className="compare__label">Витрати (до сьогодні)</span>
                <div className="compare__nums">
                  <span>план {money(fact.plannedExpenseToDate)}</span>
                  <span>факт {money(fact.actualExpenseToDate)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Category breakdown */}
          {fact.categories.length > 0 && (
            <section className="section">
              <h2 className="section__title">За категоріями</h2>
              <ul className="cat-fact-list">
                {fact.categories.map((c) => (
                  <li key={c.key} className="cat-fact">
                    <div className="cat-fact__head">
                      <span className="cat-fact__name">
                        {c.categoryName}
                        <span className="cat-fact__kind">
                          {c.kind === 'income' ? 'дохід' : 'витрата'}
                        </span>
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="cat-fact__nums">
                      <span>план {money(c.planned)}</span>
                      <span>факт {money(c.actual)}</span>
                      <span className={devClass(c.deviation)}>{signed(c.deviation)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Plan item fulfilment / linking */}
          {planItems.length > 0 && (
            <section className="section">
              <h2 className="section__title">Планові позиції: план і факт</h2>
              <p className="section__hint">
                Привʼяжіть фактичні операції до планових позицій. Одна позиція може мати
                кілька платежів (частковий факт).
              </p>
              <ul className="plan-fact-list">
                {[...planItems]
                  .map((i) => fact.items.find((f) => f.item.id === i.id)!)
                  .map((f) => (
                    <li key={f.item.id} className="plan-fact">
                      <div className="plan-fact__text">
                        <span className="plan-fact__name">
                          {f.item.name}
                          <StatusBadge status={f.status} />
                        </span>
                        <span className="plan-fact__nums">
                          план {money(f.planned)} · факт {money(f.actual)}
                          {f.linkedTxIds.length > 0 && ` · ${f.linkedTxIds.length} оп.`}
                        </span>
                      </div>
                      <Button variant="secondary" onClick={() => setLinkItem(f.item)}>
                        Привʼязати
                      </Button>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {/* Fact without plan */}
          {fact.unlinked.length > 0 && (
            <section className="section">
              <h2 className="section__title">Факт без плану</h2>
              <p className="section__hint">
                Операції цього місяця, не привʼязані до жодної планової позиції.
              </p>
              <ul className="plan-fact-list">
                {fact.unlinked.map((t) => (
                  <li key={t.id} className="plan-fact">
                    <div className="plan-fact__text">
                      <span className="plan-fact__name">{categoryName(t.categoryId)}</span>
                      <span className="plan-fact__nums">
                        {accountName(t.accountId)}
                        {t.note ? ` · ${t.note}` : ''}
                      </span>
                    </div>
                    <span
                      className={`plan-fact__amount plan-fact__amount--${t.type}`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {money(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <PlanItemLinkModal
        open={Boolean(linkItem)}
        item={linkItem}
        onClose={() => setLinkItem(null)}
      />
    </div>
  )
}
