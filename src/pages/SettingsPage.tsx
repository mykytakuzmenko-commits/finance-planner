import { useState } from 'react'
import { useSettings } from '../state/SettingsContext'
import { CURRENCIES } from '../constants/currencies'
import type { CurrencyCode } from '../types/settings'
import { TextField } from '../components/ui/TextField'
import { SelectField } from '../components/ui/SelectField'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings()
  const [name, setName] = useState(settings.name)
  const [currency, setCurrency] = useState<CurrencyCode>(settings.baseCurrency)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const dirty = name !== settings.name || currency !== settings.baseCurrency

  const save = () => {
    updateSettings({ name: name.trim(), baseCurrency: currency })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <section className="card">
        <h2 className="card__title">Профіль</h2>
        <TextField
          label="Ім'я"
          placeholder="Ваше ім'я"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
        <SelectField
          label="Основна валюта"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          options={CURRENCIES.map((c) => ({
            value: c.code,
            label: `${c.symbol} ${c.code} — ${c.label}`,
          }))}
          hint="Валюта, у якій ведеться основний облік."
        />
        <div className="card__actions">
          <Button onClick={save} disabled={!dirty}>
            Зберегти зміни
          </Button>
          {saved && <span className="save-hint">Збережено ✓</span>}
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Дані</h2>
        <p className="card__text">
          Усі дані зберігаються локально у вашому браузері. Ви можете скинути
          онбординг і почати з початку.
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Скинути та почати заново
        </Button>
      </section>

      <Modal
        open={confirmReset}
        title="Скинути налаштування?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Скасувати
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetSettings()
                setConfirmReset(false)
              }}
            >
              Так, скинути
            </Button>
          </>
        }
      >
        <p>
          Онбординг буде показано знову, а налаштування повернуться до
          початкових. Цю дію не можна скасувати.
        </p>
      </Modal>
    </div>
  )
}
