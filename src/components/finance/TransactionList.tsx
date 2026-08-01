import { useMemo } from 'react'
import type { Account, Category, Transaction } from '../../types/finance'
import { useSettings } from '../../state/SettingsContext'
import { formatMoney } from '../../utils/money'
import { formatDate } from '../../utils/date'
import { Icon, type IconName } from '../ui/Icon'

interface TransactionListProps {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

const TYPE_ICON: Record<Transaction['type'], IconName> = {
  income: 'wallet',
  expense: 'transactions',
  transfer: 'transactions',
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const { settings } = useSettings()

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]))
    return (id?: string) => (id ? map.get(id) ?? '—' : '—')
  }, [accounts])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id?: string) => (id ? map.get(id) ?? 'Без категорії' : 'Без категорії')
  }, [categories])

  const sorted = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
      ),
    [transactions],
  )

  if (sorted.length === 0) return null

  return (
    <ul className="tx-list">
      {sorted.map((t) => {
        const isTransfer = t.type === 'transfer'
        const title = isTransfer
          ? `${accountName(t.fromAccountId)} → ${accountName(t.toAccountId)}`
          : categoryName(t.categoryId)
        const subtitle = isTransfer
          ? t.note || 'Переказ'
          : `${accountName(t.accountId)}${t.note ? ` · ${t.note}` : ''}`
        const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''
        return (
          <li key={t.id} className="tx-row">
            <button
              type="button"
              className="tx-row__main"
              onClick={() => onEdit(t)}
            >
              <span className={`tx-row__icon tx-row__icon--${t.type}`} aria-hidden="true">
                <Icon name={TYPE_ICON[t.type]} size={18} />
              </span>
              <span className="tx-row__text">
                <span className="tx-row__title">{title}</span>
                <span className="tx-row__subtitle">
                  {subtitle} · {formatDate(t.date)}
                </span>
              </span>
              <span className={`tx-row__amount tx-row__amount--${t.type}`}>
                {sign}
                {formatMoney(t.amount, settings.baseCurrency)}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--danger tx-row__delete"
              aria-label="Видалити операцію"
              onClick={() => onDelete(t)}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
