import { useEffect, useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { usePlanning } from '../state/PlanningContext'
import { useSettings } from '../state/SettingsContext'
import { formatMoney } from '../utils/money'
import { toBase } from '../utils/rates'
import { currentMonth, formatMonth } from '../utils/month'
import { todayISO } from '../utils/date'
import { buildForecast } from '../calculations/forecast'
import { buildPlanFact } from '../calculations/planFact'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { KpiCard } from '../components/finance/KpiCard'
import { AccountFormModal } from '../components/finance/AccountFormModal'
import { TransactionFormModal } from '../components/finance/TransactionFormModal'
import { TransactionList } from '../components/finance/TransactionList'
import { CashFlowBar } from '../components/finance/CashFlowBar'
import { ForecastPanel } from '../components/finance/ForecastPanel'
import type { Account, Transaction } from '../types/finance'
import type { PlanItem } from '../types/planning'

const month = currentMonth()

function expectedDay(item: PlanItem): number {
  const [y, m] = item.month.split('-').map(Number)
  return item.dueDay ?? new Date(y, m, 0).getDate()
}
function expectedISO(item: PlanItem): string {
  return `${item.month}-${String(expectedDay(item)).padStart(2, '0')}`
}

export function DashboardPage() {
  const {
    loading: dataLoading,
    accounts,
    categories,
    transactions,
    balances,
    deleteAccount,
    deleteTransaction,
  } = useData()
  const { loading: planLoading, itemsForMonth, ensureMonth } = usePlanning()
  const { settings } = useSettings()
  const currency = settings.baseCurrency
  const loading = dataLoading || planLoading

  const [accountModal, setAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)

  useEffect(() => {
    if (!planLoading) void ensureMonth(month)
  }, [planLoading, ensureMonth])

  const rates = settings.exchangeRates
  const accountCurrency = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.currency]))
    return (id?: string) => (id ? map.get(id) ?? currency : currency)
  }, [accounts, currency])

  const planItems = itemsForMonth(month)
  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(`${month}-`)),
    [transactions],
  )
  // Convert to base currency so multi-currency accounts total correctly.
  const currentBalanceBase = useMemo(
    () => accounts.reduce((s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates), 0),
    [accounts, balances, rates],
  )
  const monthTxBase = useMemo(
    () =>
      monthTx.map((t) => ({
        ...t,
        amount: toBase(t.amount, accountCurrency(t.accountId), rates),
      })),
    [monthTx, accountCurrency, rates],
  )
  const forecast = useMemo(
    () => buildForecast(currentBalanceBase, monthTxBase, planItems),
    [currentBalanceBase, monthTxBase, planItems],
  )
  const overspentCount = useMemo(
    () =>
      buildPlanFact(month, planItems, transactions, categories, todayISO()).categories.filter(
        (c) => c.status === 'overspent',
      ).length,
    [planItems, transactions, categories],
  )

  const today = todayISO()
  const events = useMemo(
    () =>
      [...planItems]
        .filter((i) => expectedISO(i) >= today)
        .sort((a, b) => expectedDay(a) - expectedDay(b))
        .slice(0, 6),
    [planItems, today],
  )

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [transactions],
  )

  if (loading) return <div className="page__loading">Завантаження…</div>

  if (accounts.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="wallet"
          title="Додайте перший рахунок"
          description="Рахунок — це де лежать ваші гроші: картка, готівка, ощадний рахунок. Після цього зʼявляться баланс, прогноз і safe-to-spend."
          action={
            <Button onClick={() => setAccountModal(true)}>
              <Icon name="plus" size={18} /> Додати рахунок
            </Button>
          }
        />
        <AccountFormModal open={accountModal} onClose={() => setAccountModal(false)} />
      </div>
    )
  }

  const money = (m: number) => formatMoney(m, currency)

  return (
    <div className="page">
      <p className="dash-month">{formatMonth(month)}</p>

      {/* Alerts */}
      {forecast.deficit > 0 && (
        <div className="alert alert--danger">
          <strong>Дефіцит: {money(forecast.deficit)}.</strong> Навіть з гарантованими
          доходами прогнозованих коштів не вистачає на заплановані витрати.
        </div>
      )}
      {forecast.deficit === 0 && forecast.safeToSpend < 0 && (
        <div className="alert alert--warning">
          <strong>Safe-to-spend відʼємний ({money(forecast.safeToSpend)}).</strong> Щоб
          вийти на планові заощадження, стримайте додаткові витрати.
        </div>
      )}
      {overspentCount > 0 && (
        <div className="alert alert--warning">
          {overspentCount} {overspentCount === 1 ? 'категорія перевищила' : 'категорій перевищили'} план.
          Деталі — у розділі «Аналітика».
        </div>
      )}

      {/* Hero: balance & safe-to-spend */}
      <div className="hero-grid">
        <div className="hero-card">
          <span className="hero-card__label">Поточний баланс</span>
          <span className="hero-card__value">{money(forecast.currentBalance)}</span>
        </div>
        <div className={`hero-card hero-card--accent ${forecast.safeToSpend < 0 ? 'is-negative' : ''}`}>
          <span className="hero-card__label">Safe-to-spend</span>
          <span className="hero-card__value">{money(forecast.safeToSpend)}</span>
          <span className="hero-card__hint">
            можна витратити, зберігши план і заощадження
          </span>
        </div>
      </div>

      <div className="quick-actions">
        <Button
          onClick={() => {
            setEditingTx(null)
            setTxModal(true)
          }}
        >
          <Icon name="plus" size={18} /> Додати операцію
        </Button>
      </div>

      {/* Forecast */}
      <section className="section">
        <h2 className="section__title">Прогноз залишку на кінець місяця</h2>
        <ForecastPanel
          guaranteed={forecast.guaranteedForecast}
          weighted={forecast.weightedForecast}
          optimistic={forecast.optimisticForecast}
          currency={currency}
        />
      </section>

      {/* Cash flow */}
      <section className="section">
        <h2 className="section__title">Рух коштів за місяць</h2>
        <CashFlowBar
          actualIncome={forecast.actualIncome}
          upcomingIncome={forecast.upcomingIncomeWeighted}
          actualExpense={forecast.actualExpense}
          upcomingExpense={forecast.upcomingExpense}
          currency={currency}
        />
      </section>

      {/* This-month KPIs */}
      <section className="section">
        <h2 className="section__title">Цей місяць</h2>
        <div className="kpi-row kpi-row--3">
          <KpiCard label="Фактичний дохід" value={money(forecast.actualIncome)} tone="income" />
          <KpiCard label="Фактичні витрати" value={money(forecast.actualExpense)} tone="expense" />
          <KpiCard label="Майбутні доходи" value={money(forecast.upcomingIncomeWeighted)} tone="income" />
          <KpiCard label="Майбутні витрати" value={money(forecast.upcomingExpense)} tone="expense" />
          <KpiCard label="Планові заощадження" value={money(forecast.plannedSavings)} />
          <KpiCard label="Фактичні заощадження" value={money(forecast.actualSavings)} />
        </div>
      </section>

      {/* Upcoming events */}
      {events.length > 0 && (
        <section className="section">
          <h2 className="section__title">Майбутні події</h2>
          <ul className="event-list">
            {events.map((e) => (
              <li key={e.id} className="event-row">
                <span className="event-row__day">{expectedDay(e)}</span>
                <span className="event-row__name">{e.name}</span>
                <span className={`event-row__amount event-row__amount--${e.kind}`}>
                  {e.kind === 'income' ? '+' : '−'}
                  {money(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Accounts */}
      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Рахунки</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setEditingAccount(null)
              setAccountModal(true)
            }}
          >
            <Icon name="plus" size={16} /> Рахунок
          </Button>
        </div>
        <ul className="account-list">
          {accounts.map((a) => (
            <li key={a.id} className="account-row">
              <div className="account-row__info">
                <span className="account-row__name">{a.name}</span>
                <span className="account-row__currency">{a.currency}</span>
              </div>
              <span className="account-row__balance">
                {formatMoney(balances.get(a.id) ?? 0, a.currency)}
              </span>
              <div className="account-row__actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Редагувати рахунок ${a.name}`}
                  onClick={() => {
                    setEditingAccount(a)
                    setAccountModal(true)
                  }}
                >
                  <Icon name="settings" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Видалити рахунок ${a.name}`}
                  onClick={() => setDeletingAccount(a)}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent operations */}
      <section className="section">
        <h2 className="section__title">Останні операції</h2>
        {recent.length === 0 ? (
          <p className="section__empty">Операцій ще немає. Натисніть «Додати операцію».</p>
        ) : (
          <TransactionList
            transactions={recent}
            accounts={accounts}
            categories={categories}
            onEdit={(t) => {
              setEditingTx(t)
              setTxModal(true)
            }}
            onDelete={(t) => setDeletingTx(t)}
          />
        )}
      </section>

      <AccountFormModal
        open={accountModal}
        account={editingAccount}
        onClose={() => {
          setAccountModal(false)
          setEditingAccount(null)
        }}
      />
      <TransactionFormModal
        open={txModal}
        transaction={editingTx}
        onClose={() => {
          setTxModal(false)
          setEditingTx(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingAccount)}
        title="Видалити рахунок?"
        message={`Рахунок «${deletingAccount?.name}» та всі повʼязані з ним операції буде видалено без можливості відновлення.`}
        confirmLabel="Видалити"
        danger
        onCancel={() => setDeletingAccount(null)}
        onConfirm={async () => {
          if (deletingAccount) await deleteAccount(deletingAccount.id)
          setDeletingAccount(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingTx)}
        title="Видалити операцію?"
        message="Операцію буде видалено, а баланс рахунку перераховано."
        confirmLabel="Видалити"
        danger
        onCancel={() => setDeletingTx(null)}
        onConfirm={async () => {
          if (deletingTx) await deleteTransaction(deletingTx.id)
          setDeletingTx(null)
        }}
      />
    </div>
  )
}
