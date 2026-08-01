import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { SelectField } from '../ui/SelectField'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import {
  usePlanning,
  type PlanRecurrence,
} from '../../state/PlanningContext'
import type { PlanItem, PlanKind, PlanScope } from '../../types/planning'
import { minorToInput, parseAmount } from '../../utils/money'

interface PlanItemFormModalProps {
  open: boolean
  month: string
  /** For creating a new item. Ignored when editing. */
  defaultKind?: PlanKind
  item?: PlanItem | null
  onClose: () => void
}

const RECURRENCE_LABELS: Record<PlanRecurrence, string> = {
  once: 'Одноразово',
  monthly: 'Щомісяця',
  quarterly: 'Щокварталу',
}

export function PlanItemFormModal({
  open,
  month,
  defaultKind = 'expense',
  item,
  onClose,
}: PlanItemFormModalProps) {
  const { categories } = useData()
  const { settings } = useSettings()
  const { addItem, updateItem } = usePlanning()

  const editing = Boolean(item)
  const [kind, setKind] = useState<PlanKind>(defaultKind)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [recurrence, setRecurrence] = useState<PlanRecurrence>('monthly')
  const [probability, setProbability] = useState('100')
  const [scope, setScope] = useState<PlanScope>('single')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (item) {
      setKind(item.kind)
      setName(item.name)
      setAmount(minorToInput(item.amount))
      setCategoryId(item.categoryId ?? '')
      setProbability(String(item.probability ?? 100))
      setScope('single')
    } else {
      setKind(defaultKind)
      setName('')
      setAmount('')
      setCategoryId('')
      setRecurrence('monthly')
      setProbability('100')
    }
  }, [open, item, defaultKind])

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind],
  )
  const categoryOptions = [
    { value: '', label: 'Без категорії' },
    ...relevantCategories.map((c) => ({ value: c.id, label: c.name })),
  ]

  const isRecurringItem = Boolean(item?.templateId)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Вкажіть назву.')
      return
    }
    const minor = parseAmount(amount)
    if (minor === null) {
      setError('Вкажіть коректну суму більшу за 0.')
      return
    }
    let prob: number | undefined
    if (kind === 'income') {
      const p = Number(probability)
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        setError('Ймовірність має бути від 0 до 100.')
        return
      }
      prob = Math.round(p)
    }

    if (item) {
      await updateItem(
        item,
        {
          name: trimmed,
          amount: minor,
          categoryId: categoryId || undefined,
          probability: prob,
        },
        isRecurringItem ? scope : 'single',
      )
    } else {
      await addItem({
        month,
        kind,
        name: trimmed,
        amount: minor,
        categoryId: categoryId || undefined,
        probability: prob,
        recurrence,
      })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Редагувати план' : 'Нова планова позиція'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={submit}>{editing ? 'Зберегти' : 'Додати'}</Button>
        </>
      }
    >
      {!editing && (
        <div className="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={kind === 'income'}
            className={`segmented__item ${kind === 'income' ? 'is-active' : ''} segmented__item--income`}
            onClick={() => setKind('income')}
          >
            Дохід
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kind === 'expense'}
            className={`segmented__item ${kind === 'expense' ? 'is-active' : ''} segmented__item--expense`}
            onClick={() => setKind('expense')}
          >
            Витрата
          </button>
        </div>
      )}

      <TextField
        label="Назва"
        placeholder={kind === 'income' ? 'Напр., Аванс, Зарплата, Бонус' : 'Напр., Оренда, Комуналка'}
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        label={`Сума (${settings.baseCurrency})`}
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <SelectField
        label="Категорія"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        options={categoryOptions}
      />

      {kind === 'income' && (
        <TextField
          label="Ймовірність, %"
          inputMode="numeric"
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          hint="100 — гарантований дохід. Менше — ймовірний (напр., бонус)."
        />
      )}

      {!editing && (
        <SelectField
          label="Повторюваність"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as PlanRecurrence)}
          options={(Object.keys(RECURRENCE_LABELS) as PlanRecurrence[]).map((r) => ({
            value: r,
            label: RECURRENCE_LABELS[r],
          }))}
          hint="Регулярні позиції переносяться на наступні місяці, одноразові — ні."
        />
      )}

      {editing && isRecurringItem && (
        <div className="field">
          <span className="field__label">Застосувати зміни до</span>
          <div className="scope-choice">
            <label className="scope-option">
              <input
                type="radio"
                name="scope"
                checked={scope === 'single'}
                onChange={() => setScope('single')}
              />
              <span>Тільки цього місяця</span>
            </label>
            <label className="scope-option">
              <input
                type="radio"
                name="scope"
                checked={scope === 'future'}
                onChange={() => setScope('future')}
              />
              <span>Цього та всіх наступних місяців</span>
            </label>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
