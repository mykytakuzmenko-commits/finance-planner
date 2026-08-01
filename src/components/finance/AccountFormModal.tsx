import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { useData } from '../../state/DataContext'
import { useSettings } from '../../state/SettingsContext'
import type { Account } from '../../types/finance'
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
  const [error, setError] = useState<string | null>(null)

  const editing = Boolean(account)

  useEffect(() => {
    if (!open) return
    setName(account?.name ?? '')
    setBalance(account ? minorToInput(account.initialBalance) : '0.00')
    setError(null)
  }, [open, account])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Вкажіть назву рахунку.')
      return
    }
    // Initial balance may be zero, so parse leniently (allow "0").
    const parsed = balance.trim() === '' ? 0 : parseAmount(balance) ?? NaN
    const initialBalance = balance.trim() === '' || balance.trim() === '0' ? 0 : parsed
    if (Number.isNaN(initialBalance)) {
      setError('Некоректний початковий баланс.')
      return
    }

    if (account) {
      await updateAccount({ ...account, name: trimmed, initialBalance })
    } else {
      await addAccount({
        name: trimmed,
        initialBalance,
        currency: settings.baseCurrency,
      })
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
      <TextField
        label={`Початковий баланс (${settings.baseCurrency})`}
        inputMode="decimal"
        placeholder="0.00"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        hint="Скільки грошей на рахунку зараз."
      />
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}
