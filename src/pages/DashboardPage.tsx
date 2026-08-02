import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { usePlanning } from '../state/PlanningContext'
import { useSettings } from '../state/SettingsContext'
import { useSavingsGoals } from '../state/SavingsGoalsContext'
import { formatMoney } from '../utils/money'
import { toBase } from '../utils/rates'
import { currentMonth, formatMonth } from '../utils/month'
import { buildForecast } from '../calculations/forecast'
import { buildMonthlyCashFlow, buildExpenseBreakdown } from '../calculations/charts'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { AccountFormModal } from '../components/finance/AccountFormModal'
import { TransactionFormModal } from '../components/finance/TransactionFormModal'
import { TransactionList } from '../components/finance/TransactionList'
import { ForecastPanel } from '../components/finance/ForecastPanel'
import { RecommendationsPanel } from '../components/finance/RecommendationsPanel'
import { InsightsStrip } from '../components/finance/InsightsStrip'
import { SubscriptionsCard } from '../components/finance/SubscriptionsCard'
import { buildInsights } from '../calculations/insights'
import { detectSubscriptions } from '../calculations/subscriptions'
import { AccountCards } from '../components/finance/AccountCards'
import { useRecommendations } from '../hooks/useRecommendations'
import { getLastBackup } from '../services/backup'
import { Link } from '../router/Router'
import type { Account, Transaction } from '../types/finance'

// Charts pull in the (heavy) Recharts library — load them lazily so the
// dashboard shell, KPIs and insights paint before the chart chunk arrives.
const CashFlowChart = lazy(() =>
  import('../components/finance/CashFlowChart').then((m) => ({ default: m.CashFlowChart })),
)
const ExpenseDonut = lazy(() =>
  import('../components/finance/ExpenseDonut').then((m) => ({ default: m.ExpenseDonut })),
)

const month = currentMonth()

function ChangeBadge({ pct, positiveIsGood = true }: { pct: number | null; positiveIsGood?: boolean }) {
  if (pct === null || !Number.isFinite(pct)) return null
  const up = pct >= 0
  const good = up === positiveIsGood
  return (
    <span className={`change ${good ? 'change--up' : 'change--down'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
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
  const { goals } = useSavingsGoals()
  const { settings } = useSettings()
  const currency = settings.baseCurrency
  const rates = settings.exchangeRates
  const loading = dataLoading || planLoading

  const [accountModal, setAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)

  const [backupSnoozed, setBackupSnoozed] = useState(
    () => sessionStorage.getItem('pfp.backupSnooze') === '1',
  )
  const backupOverdue = useMemo(() => {
    if (backupSnoozed) return false
    const last = getLastBackup()
    if (!last) return true
    const age = Date.now() - new Date(last).getTime()
    return !Number.isFinite(age) || age > 14 * 86400000
  }, [backupSnoozed])

  useEffect(() => {
    if (!planLoading) void ensureMonth(month)
  }, [planLoading, ensureMonth])

  const planItems = itemsForMonth(month)

  const accountCurrency = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.currency]))
    return (id?: string) => (id ? map.get(id) ?? currency : currency)
  }, [accounts, currency])

  const currentBalanceBase = useMemo(
    () => accounts.reduce((s, a) => s + toBase(balances.get(a.id) ?? 0, a.currency, rates), 0),
    [accounts, balances, rates],
  )
  const monthTxBase = useMemo(
    () =>
      transactions
        .filter((t) => t.date.startsWith(`${month}-`))
        .map((t) => ({ ...t, amount: toBase(t.amount, accountCurrency(t.accountId), rates) })),
    [transactions, accountCurrency, rates],
  )
  const forecast = useMemo(
    () => buildForecast(currentBalanceBase, monthTxBase, planItems),
    [currentBalanceBase, monthTxBase, planItems],
  )

  const cashFlow = useMemo(
    () => buildMonthlyCashFlow(transactions, accounts, rates, currency, 6),
    [transactions, accounts, rates, currency],
  )
  const breakdown = useMemo(
    () => buildExpenseBreakdown(transactions, categories, accounts, rates, currency, month),
    [transactions, categories, accounts, rates, currency],
  )

  const incomeChange = useMemo(() => {
    const [prev, cur] = [cashFlow.at(-2)?.income, cashFlow.at(-1)?.income]
    if (!prev || cur === undefined) return null
    return ((cur - prev) / prev) * 100
  }, [cashFlow])
  const expenseChange = useMemo(() => {
    const [prev, cur] = [cashFlow.at(-2)?.expense, cashFlow.at(-1)?.expense]
    if (!prev || cur === undefined) return null
    return ((cur - prev) / prev) * 100
  }, [cashFlow])

  const topGoals = useMemo(
    () =>
      goals.slice(0, 2).map((g) => ({
        name: g.name,
        pct: g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0,
      })),
    [goals],
  )

  const insights = useMemo(() => buildInsights(cashFlow, breakdown), [cashFlow, breakdown])
  const subscriptions = useMemo(
    () => detectSubscriptions(transactions, categories, accounts, rates, currency, month),
    [transactions, categories, accounts, rates, currency],
  )

  const recommendations = useRecommendations()
  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [transactions],
  )

  const money = (m: number) => formatMoney(m, currency)

  if (loading) return <div className="page__loading">Завантаження…</div>

  if (accounts.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="wallet"
          title="Додайте перший рахунок"
          description="Рахунок — це де лежать ваші гроші: картка, готівка, ощадний рахунок. Після цього зʼявляться баланс, прогноз і графіки."
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

  return (
    <div className="page dash">
      <div className="dash__head">
        <p className="dash-month">{formatMonth(month)}</p>
        <Button
          onClick={() => {
            setEditingTx(null)
            setTxModal(true)
          }}
        >
          <Icon name="plus" size={18} /> Додати операцію
        </Button>
      </div>

      {backupOverdue && (
        <div className="alert alert--warning backup-reminder">
          <span>Давно не робили резервну копію — експортуйте дані, щоб не втратити їх.</span>
          <span className="report-actions">
            <Link to="/settings" className="btn btn--secondary">До налаштувань</Link>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                sessionStorage.setItem('pfp.backupSnooze', '1')
                setBackupSnoozed(true)
              }}
            >
              Пізніше
            </button>
          </span>
        </div>
      )}
      {forecast.deficit > 0 && (
        <div className="alert alert--danger">
          <strong>Дефіцит: {money(forecast.deficit)}.</strong> Прогнозованих коштів не
          вистачає на заплановані витрати.
        </div>
      )}

      {/* Top: balance hero + KPI cards */}
      <div className="dash-top">
        <div className="balance-hero">
          <span className="balance-hero__label">Загальний баланс</span>
          <span className="balance-hero__value">{money(forecast.currentBalance)}</span>
          <span className="balance-hero__sub">
            Safe-to-spend:{' '}
            <strong className={forecast.safeToSpend < 0 ? 'neg' : 'pos'}>
              {money(forecast.safeToSpend)}
            </strong>
          </span>
        </div>

        <div className="kpi-stat kpi-stat--income">
          <div className="kpi-stat__head">
            <span>Доходи (місяць)</span>
            <span className="kpi-stat__icon"><Icon name="wallet" size={16} /></span>
          </div>
          <span className="kpi-stat__value">{money(forecast.actualIncome)}</span>
          <ChangeBadge pct={incomeChange} />
        </div>

        <div className="kpi-stat kpi-stat--expense">
          <div className="kpi-stat__head">
            <span>Витрати (місяць)</span>
            <span className="kpi-stat__icon"><Icon name="transactions" size={16} /></span>
          </div>
          <span className="kpi-stat__value">{money(forecast.actualExpense)}</span>
          <ChangeBadge pct={expenseChange} positiveIsGood={false} />
        </div>

        <div className="kpi-stat kpi-stat--savings">
          <div className="kpi-stat__head">
            <span>Заощадження (місяць)</span>
            <span className="kpi-stat__icon"><Icon name="savings" size={16} /></span>
          </div>
          <span className="kpi-stat__value">{money(forecast.actualSavings)}</span>
          {topGoals.length > 0 ? (
            <div className="kpi-goals">
              {topGoals.map((g) => (
                <div key={g.name} className="kpi-goal">
                  <span className="kpi-goal__label">
                    {g.name} <span>{g.pct.toFixed(0)}%</span>
                  </span>
                  <div className="budget-bar">
                    <div className="budget-bar__fill budget-bar__fill--on-track" style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Link to="/savings" className="kpi-stat__link">Додати ціль →</Link>
          )}
        </div>
      </div>

      {/* At-a-glance insights */}
      <InsightsStrip insights={insights} />

      {/* Charts */}
      <div className="dash-charts">
        <section className="section-card">
          <h2 className="section__title">Аналіз грошових потоків</h2>
          <Suspense fallback={<div className="chart-skeleton" />}>
            <CashFlowChart data={cashFlow} currency={currency} />
          </Suspense>
        </section>
        <section className="section-card">
          <h2 className="section__title">Розподіл витрат</h2>
          <Suspense fallback={<div className="chart-skeleton" />}>
            <ExpenseDonut data={breakdown} currency={currency} />
          </Suspense>
        </section>
      </div>

      {/* Forecast */}
      <section className="section-card">
        <h2 className="section__title">Прогноз залишку на кінець місяця</h2>
        <ForecastPanel
          guaranteed={forecast.guaranteedForecast}
          weighted={forecast.weightedForecast}
          optimistic={forecast.optimisticForecast}
          currency={currency}
        />
      </section>

      {/* Recommendations */}
      <RecommendationsPanel recommendations={recommendations} />

      {/* Detected subscriptions / regular payments */}
      <SubscriptionsCard subscriptions={subscriptions} currency={currency} />

      {/* Recent transactions + account cards */}
      <div className="dash-bottom">
        <section className="section-card">
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

        <section className="section-card">
          <div className="section__head">
            <h2 className="section__title">Мої рахунки</h2>
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
          <AccountCards
            accounts={accounts}
            balances={balances}
            onEdit={(a) => {
              setEditingAccount(a)
              setAccountModal(true)
            }}
            onDelete={(a) => setDeletingAccount(a)}
          />
        </section>
      </div>

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
        message={`Рахунок «${deletingAccount?.name}» та всі повʼязані операції буде видалено.`}
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
