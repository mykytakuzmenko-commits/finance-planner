import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { SelectField } from '../ui/SelectField'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import { useWeeklyBudget } from '../../state/WeeklyBudgetContext'
import type { WeeklyLimit } from '../../types/weekly'
import { minorToInput, parseAmount } from '../../utils/money'

interface WeeklyLimitModalProps {
  open: boolean
  weekStart: string
  /** When set, edit this line's amount (category is locked). */
  editing?: WeeklyLimit | null
  /** Category ids already budgeted this week (hidden from the picker when adding). */
  usedCategoryIds: string[]
  onClose: () => void
}

export function WeeklyLimitModal({
  open,
  weekStart,
  editing,
  usedCategoryIds,
  onClose,
}: WeeklyLimitModalProps) {
  const { categories } = useData()
  const { settings } = useSettings()
  const { setLimit } = useWeeklyBudget()

  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === 'expense'),
    [categories],
  )
  const available = useMemo(
    () => expenseCategories.filter((c) => !usedCategoryIds.includes(c.id)),
    [expenseCategories, usedCategoryIds],
  )

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setCategoryId(editing.categoryId)
      setAmount(minorToInput(editing.limit))
    } else {
      setCategoryId(available[0]?.id ?? '')
      setAmount('')
    }
  }, [open, editing, available])

  const submit = async () => {
    if (!categoryId) {
      setError('Оберіть категорію.')
      return
    }
    const minor = parseAmount(amount)
    if (minor === null) {
      setError('Вкажіть коректний ліміт більший за 0.')
      return
    }
    await setLimit(weekStart, categoryId, minor)
    onClose()
  }

  const noCategories = !editing && available.length === 0

  return (
    <Modal
      open={open}
      title={editing ? 'Змінити ліміт' : 'Ліміт на категорію'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={submit} disabled={noCategories}>
            {editing ? 'Зберегти' : 'Додати'}
          </Button>
        </>
      }
    >
      {noCategories ? (
        <p className="form-error">Усі категорії витрат уже мають ліміт на цей тиждень.</p>
      ) : (
        <>
          {editing ? (
            <div className="field">
              <span className="field__label">Категорія</span>
              <p className="weekly-cat-locked">
                {categories.find((c) => c.id === categoryId)?.name ?? 'Категорія'}
              </p>
            </div>
          ) : (
            <SelectField
              label="Категорія"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={available.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          <TextField
            label={`Тижневий ліміт (${settings.baseCurrency})`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </>
      )}
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
