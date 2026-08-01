import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { SelectField } from '../ui/SelectField'
import { useSettings } from '../../state/SettingsContext'
import { useSavingsGoals } from '../../state/SavingsGoalsContext'
import { CURRENCIES } from '../../constants/currencies'
import type { CurrencyCode } from '../../types/settings'
import type { SavingsGoal } from '../../types/savings'
import { minorToInput, parseAmount } from '../../utils/money'

interface SavingsGoalModalProps {
  open: boolean
  goal?: SavingsGoal | null
  onClose: () => void
}

export function SavingsGoalModal({ open, goal, onClose }: SavingsGoalModalProps) {
  const { settings } = useSettings()
  const { addGoal, updateGoal } = useSavingsGoals()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>(settings.baseCurrency)
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const editing = Boolean(goal)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(goal?.name ?? '')
    setCurrency(goal?.currency ?? settings.baseCurrency)
    setTarget(goal ? minorToInput(goal.target) : '')
    setSaved(goal ? minorToInput(goal.saved) : '0')
  }, [open, goal, settings.baseCurrency])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Вкажіть назву цілі.')
      return
    }
    const targetMinor = parseAmount(target)
    if (targetMinor === null) {
      setError('Вкажіть цільову суму більшу за 0.')
      return
    }
    const savedMinor = saved.trim() === '' || saved.trim() === '0' ? 0 : parseAmount(saved) ?? NaN
    if (Number.isNaN(savedMinor)) {
      setError('Некоректна накопичена сума.')
      return
    }

    if (goal) {
      await updateGoal({ ...goal, name: trimmed, currency, target: targetMinor, saved: savedMinor })
    } else {
      await addGoal({ name: trimmed, currency, target: targetMinor, saved: savedMinor })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Редагувати ціль' : 'Нова ціль заощаджень'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button onClick={submit}>{editing ? 'Зберегти' : 'Створити'}</Button>
        </>
      }
    >
      <TextField
        label="Назва цілі"
        placeholder="Напр., Відпустка, Подушка, Нова техніка"
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      <SelectField
        label="Валюта"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.code}` }))}
      />
      <TextField
        label={`Цільова сума (${currency})`}
        inputMode="decimal"
        placeholder="0.00"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <TextField
        label={`Уже накопичено (${currency})`}
        inputMode="decimal"
        placeholder="0.00"
        value={saved}
        onChange={(e) => setSaved(e.target.value)}
      />
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
