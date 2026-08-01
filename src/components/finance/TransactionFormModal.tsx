import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { SelectField } from '../ui/SelectField'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import type { Transaction, TransactionType } from '../../types/finance'
import { formatMoney, minorToInput, parseAmount } from '../../utils/money'
import { convert } from '../../utils/rates'
import { todayISO } from '../../utils/date'

interface TransactionFormModalProps {
  open: boolean
  transaction?: Transaction | null
  /** Preselect a type when creating. */
  defaultType?: TransactionType
  onClose: () => void
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Дохід',
  expense: 'Витрата',
  transfer: 'Переказ',
}

export function TransactionFormModal({
  open,
  transaction,
  defaultType = 'expense',
  onClose,
}: TransactionFormModalProps) {
  const { accounts, categories, addTransaction, updateTransaction } = useData()
  const { settings } = useSettings()

  const [type, setType] = useState<TransactionType>(defaultType)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const editing = Boolean(transaction)

  useEffect(() => {
    if (!open) return
    const t = transaction
    const initialType = t?.type ?? defaultType
    setType(initialType)
    setAmount(t ? minorToInput(t.amount) : '')
    setDate(t?.date ?? todayISO())
    setNote(t?.note ?? '')
    setError(null)
    setToAmount(t?.toAmount ? minorToInput(t.toAmount) : '')
    if (t?.type === 'transfer') {
      setAccountId(t.fromAccountId ?? '')
      setToAccountId(t.toAccountId ?? '')
      setCategoryId('')
    } else {
      setAccountId(t?.accountId ?? accounts[0]?.id ?? '')
      setToAccountId('')
      setCategoryId(t?.categoryId ?? '')
    }
  }, [open, transaction, defaultType, accounts])

  const fromAcc = accounts.find((a) => a.id === accountId)
  const toAcc = accounts.find((a) => a.id === toAccountId)
  const crossCurrency =
    type === 'transfer' && !!fromAcc && !!toAcc && fromAcc.currency !== toAcc.currency
  const suggestedTo =
    crossCurrency && parseAmount(amount) !== null
      ? convert(parseAmount(amount)!, fromAcc!.currency, toAcc!.currency, settings.exchangeRates)
      : null

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')),
    [categories, type],
  )

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))
  const categoryOptions = [
    { value: '', label: 'Без категорії' },
    ...relevantCategories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const changeType = (next: TransactionType) => {
    setType(next)
    setError(null)
    if (next === 'transfer') {
      setAccountId((prev) => prev || accounts[0]?.id || '')
      setToAccountId((prev) => prev || accounts[1]?.id || '')
    } else {
      setAccountId((prev) => prev || accounts[0]?.id || '')
      setCategoryId('')
    }
  }

  const submit = async () => {
    const minor = parseAmount(amount)
    if (minor === null) {
      setError('Вкажіть коректну суму більшу за 0.')
      return
    }
    if (type === 'transfer') {
      if (!accountId || !toAccountId) {
        setError('Оберіть рахунки для переказу.')
        return
      }
      if (accountId === toAccountId) {
        setError('Рахунки переказу мають бути різними.')
        return
      }
    } else if (!accountId) {
      setError('Оберіть рахунок.')
      return
    }

    const base = {
      type,
      amount: minor,
      date,
      note: note.trim() || undefined,
    }

    let toAmt: number | undefined
    if (type === 'transfer' && crossCurrency) {
      toAmt = parseAmount(toAmount) ?? suggestedTo ?? undefined
    }

    let payload: Omit<Transaction, 'id' | 'createdAt'>
    if (type === 'transfer') {
      payload = { ...base, fromAccountId: accountId, toAccountId, toAmount: toAmt }
    } else {
      payload = { ...base, accountId, categoryId: categoryId || undefined }
    }

    if (transaction) {
      await updateTransaction({
        ...transaction,
        ...payload,
        // Clear fields that don't apply to the new type.
        accountId: type === 'transfer' ? undefined : accountId,
        categoryId: type === 'transfer' ? undefined : categoryId || undefined,
        fromAccountId: type === 'transfer' ? accountId : undefined,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        toAmount: type === 'transfer' ? toAmt : undefined,
      })
    } else {
      await addTransaction(payload)
    }
    onClose()
  }

  const noAccounts = accounts.length === 0
  const notEnoughForTransfer = type === 'transfer' && accounts.length < 2

  return (
    <Modal
      open={open}
      title={editing ? 'Редагувати операцію' : 'Нова операція'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            onClick={submit}
            disabled={noAccounts || notEnoughForTransfer}
          >
            {editing ? 'Зберегти' : 'Додати'}
          </Button>
        </>
      }
    >
      <div className="segmented" role="tablist">
        {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={type === t}
            className={`segmented__item ${type === t ? 'is-active' : ''} segmented__item--${t}`}
            onClick={() => changeType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {noAccounts ? (
        <p className="form-error">
          Спершу створіть хоча б один рахунок на дашборді.
        </p>
      ) : notEnoughForTransfer ? (
        <p className="form-error">
          Для переказу потрібні щонайменше два рахунки.
        </p>
      ) : (
        <>
          <TextField
            label={`Сума (${fromAcc?.currency ?? settings.baseCurrency})`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />

          {type === 'transfer' ? (
            <>
              <SelectField
                label="З рахунку"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accountOptions}
              />
              <SelectField
                label="На рахунок"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                options={accountOptions}
              />
              {crossCurrency && (
                <TextField
                  label={`Сума зарахування (${toAcc!.currency})`}
                  inputMode="decimal"
                  placeholder={suggestedTo !== null ? minorToInput(suggestedTo) : '0.00'}
                  value={toAmount}
                  onChange={(e) => setToAmount(e.target.value)}
                  hint={
                    suggestedTo !== null
                      ? `За курсом ≈ ${formatMoney(suggestedTo, toAcc!.currency)}. Змініть за потреби.`
                      : 'Скільки буде зараховано в валюті призначення.'
                  }
                />
              )}
            </>
          ) : (
            <>
              <SelectField
                label="Рахунок"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accountOptions}
              />
              <SelectField
                label="Категорія"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categoryOptions}
              />
            </>
          )}

          <TextField
            label="Дата"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="Нотатка (необовʼязково)"
            placeholder="Опис операції"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
          />
        </>
      )}

      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
