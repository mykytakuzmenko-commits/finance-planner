import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { SelectField } from '../ui/SelectField'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import type { Account } from '../../types/finance'
import type { CurrencyCode } from '../../types/settings'
import { CURRENCIES } from '../../constants/currencies'
import { minorToInput, parseAmount } from '../../utils/money'

interface AccountFormModalProps {
  open: boolean
  account?: Account | null
  onClose: () => void
}

export function AccountFormModal({ open, account, onClose }: AccountFormModalProps) {
  const { addAccount, updateAccount } = useData()
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('0.00')
  const [currency, setCurrency] = useState<CurrencyCode>(settings.baseCurrency)
  const [isSavings, setIsSavings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editing = Boolean(account)

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setBalance(account ? minorToInput(account.initialBalance) : '0.00')
    setCurrency(account?.currency ?? settings.baseCurrency)
    setIsSavings(account?.isSavings ?? false)
    setError(null)
  }, [open, account, settings.baseCurrency])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Вкажіть назву рахунку.')
      return
    }
    const parsed = balance.trim() === '' ? 0 : parseAmount(balance) ?? NaN
    const initialBalance = balance.trim() === '' || balance.trim() === '0' ? 0 : parsed
    if (Number.isNaN(initialBalance)) {
      setError('Некоректний початковий баланс.')
      return
    }

    if (account) {
      await updateAccount({ ...account, name: trimmed, initialBalance, currency, isSavings })
    } else {
      await addAccount({ name: trimmed, initialBalance, currency, isSavings })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      title={editing ? 'Редагувати рахунок' : 'Новий рахунок'}
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
        label="Назва рахунку"
        placeholder="Напр., Картка, Готівка, Ощадний"
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
      />
      <SelectField
        label="Валюта"
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        options={CURRENCIES.map((c) => ({
          value: c.code,
          label: `${c.symbol} ${c.code} — ${c.label}`,
        }))}
      />
      <TextField
        label={`Початковий баланс (${currency})`}
        inputMode="decimal"
        placeholder="0.00"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        hint="Скільки грошей на рахунку зараз."
      />
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={isSavings}
          onChange={(e) => setIsSavings(e.target.checked)}
        />
        <span>Ощадний рахунок (враховується у заощадженнях і подушці)</span>
      </label>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
