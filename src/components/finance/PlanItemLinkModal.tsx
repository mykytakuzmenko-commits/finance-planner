import { useMemo } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import type { PlanItem } from '../../types/planning'
import type { Transaction } from '../../types/finance'
import { formatMoney } from '../../utils/money'
import { formatDate } from '../../utils/date'

interface PlanItemLinkModalProps {
  open: boolean
  item: PlanItem | null
  onClose: () => void
}

export function PlanItemLinkModal({ open, item, onClose }: PlanItemLinkModalProps) {
  const { transactions, categories, accounts, linkTransaction } = useData()
  const { settings } = useSettings()
  const currency = settings.baseCurrency

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id?: string) => (id ? map.get(id) ?? 'Без категорії' : 'Без категорії')
  }, [categories])
  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]))
    return (id?: string) => (id ? map.get(id) ?? '—' : '—')
  }, [accounts])

  const linked = useMemo(
    () => (item ? transactions.filter((t) => t.planItemId === item.id) : []),
    [transactions, item],
  )
  const linkedActual = linked.reduce((a, t) => a + t.amount, 0)
  const remaining = item ? item.amount - linkedActual : 0

  const candidates = useMemo(() => {
    if (!item) return []
    return transactions
      .filter(
        (t) =>
          t.type === item.kind &&
          t.date.startsWith(`${item.month}-`) &&
          !t.planItemId,
      )
      .sort((a, b) => {
        // Category matches first, then closeness to the remaining amount.
        const am = item.categoryId && a.categoryId === item.categoryId ? 0 : 1
        const bm = item.categoryId && b.categoryId === item.categoryId ? 0 : 1
        if (am !== bm) return am - bm
        return Math.abs(a.amount - remaining) - Math.abs(b.amount - remaining)
      })
  }, [transactions, item, remaining])

  if (!item) return null

  const row = (t: Transaction, action: 'link' | 'unlink') => (
    <li key={t.id} className="link-row">
      <div className="link-row__text">
        <span className="link-row__amount">{formatMoney(t.amount, currency)}</span>
        <span className="link-row__meta">
          {categoryName(t.categoryId)} · {accountName(t.accountId)} · {formatDate(t.date)}
          {t.note ? ` · ${t.note}` : ''}
        </span>
      </div>
      {action === 'link' ? (
        <Button variant="secondary" onClick={() => linkTransaction(t.id, item.id)}>
          Привʼязати
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => linkTransaction(t.id, undefined)}>
          Відвʼязати
        </Button>
      )}
    </li>
  )

  return (
    <Modal open={open} title={`Факт: ${item.name}`} onClose={onClose}>
      <div className="link-summary">
        <span>
          План: <strong>{formatMoney(item.amount, currency)}</strong>
        </span>
        <span>
          Факт: <strong>{formatMoney(linkedActual, currency)}</strong>
        </span>
        <span>
          Залишок: <strong>{formatMoney(Math.max(0, remaining), currency)}</strong>
        </span>
      </div>

      {linked.length > 0 && (
        <>
          <h3 className="link-heading">Привʼязані операції</h3>
          <ul className="link-list">{linked.map((t) => row(t, 'unlink'))}</ul>
        </>
      )}

      <h3 className="link-heading">
        {item.categoryId ? 'Пропозиції та інші операції' : 'Доступні операції'}
      </h3>
      {candidates.length === 0 ? (
        <p className="section__empty">
          Немає непривʼязаних {item.kind === 'income' ? 'доходів' : 'витрат'} за цей місяць.
        </p>
      ) : (
        <ul className="link-list">{candidates.map((t) => row(t, 'link'))}</ul>
      )}
    </Modal>
  )
}
