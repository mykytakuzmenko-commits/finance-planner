import { useState } from 'react'
import { useData } from '../state/DataContext'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TransactionFormModal } from '../components/finance/TransactionFormModal'
import { TransactionList } from '../components/finance/TransactionList'
import { CategoryManagerModal } from '../components/finance/CategoryManagerModal'
import type { Transaction } from '../types/finance'

export function TransactionsPage() {
  const { loading, accounts, categories, transactions, deleteTransaction } =
    useData()

  const [txModal, setTxModal] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [categoriesModal, setCategoriesModal] = useState(false)

  const openNew = () => {
    setEditingTx(null)
    setTxModal(true)
  }

  if (loading) {
    return <div className="page__loading">Завантаження…</div>
  }

  return (
    <div className="page">
      <div className="page__toolbar">
        <Button onClick={openNew} disabled={accounts.length === 0}>
          <Icon name="plus" size={18} /> Додати операцію
        </Button>
        <Button variant="secondary" onClick={() => setCategoriesModal(true)}>
          Категорії
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon="wallet"
          title="Спершу створіть рахунок"
          description="Щоб додавати операції, потрібен хоча б один рахунок. Створіть його на дашборді."
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="transactions"
          title="Операцій ще немає"
          description="Додайте перший дохід, витрату або переказ між рахунками."
          action={<Button onClick={openNew}>Додати операцію</Button>}
        />
      ) : (
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          onEdit={(t) => {
            setEditingTx(t)
            setTxModal(true)
          }}
          onDelete={(t) => setDeletingTx(t)}
        />
      )}

      <TransactionFormModal
        open={txModal}
        transaction={editingTx}
        onClose={() => {
          setTxModal(false)
          setEditingTx(null)
        }}
      />
      <CategoryManagerModal
        open={categoriesModal}
        onClose={() => setCategoriesModal(false)}
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
