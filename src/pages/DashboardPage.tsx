import { useMemo, useState } from 'react'
import { useData } from '../state/DataContext'
import { useSettings } from '../state/SettingsContext'
import { formatMoney } from '../utils/money'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { KpiCard } from '../components/finance/KpiCard'
import { AccountFormModal } from '../components/finance/AccountFormModal'
import { TransactionFormModal } from '../components/finance/TransactionFormModal'
import { TransactionList } from '../components/finance/TransactionList'
import type { Account, Transaction } from '../types/finance'

export function DashboardPage() {
  const {
    loading,
    accounts,
    categories,
    transactions,
    balances,
    totalBalance,
    totalIncome,
    totalExpense,
    deleteAccount,
    deleteTransaction,
  } = useData()
  const { settings } = useSettings()
  const currency = settings.baseCurrency

  const [accountModal, setAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)

  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
        .slice(0, 5),
    [transactions],
  )

  if (loading) {
    return <div className="page__loading">Завантаження…</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="page">
        <EmptyState
          icon="wallet"
          title="Додайте перший рахунок"
          description="Рахунок — це де лежать ваші гроші: картка, готівка, ощадний рахунок. Після цього ви зможете додавати доходи й витрати."
          action={
            <Button onClick={() => setAccountModal(true)}>
              <Icon name="plus" size={18} /> Додати рахунок
            </Button>
          }
        />
        <AccountFormModal
          open={accountModal}
          onClose={() => setAccountModal(false)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="kpi-row">
        <KpiCard label="Загальний баланс" value={formatMoney(totalBalance, currency)} />
        <KpiCard
          label="Доходи (усього)"
          value={formatMoney(totalIncome, currency)}
          tone="income"
        />
        <KpiCard
          label="Витрати (усього)"
          value={formatMoney(totalExpense, currency)}
          tone="expense"
        />
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

      <section className="section">
        <h2 className="section__title">Останні операції</h2>
        {recent.length === 0 ? (
          <p className="section__empty">
            Операцій ще немає. Натисніть «Додати операцію».
          </p>
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
