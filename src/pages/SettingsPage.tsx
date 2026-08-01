import { useState } from 'react'
import { useSettings } from '../state/SettingsContext'
import { CURRENCIES } from '../constants/currencies'
import type { CurrencyCode } from '../types/settings'
import { defaultRates } from '../utils/rates'
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

  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CURRENCIES.map((c) => [c.code, String(settings.exchangeRates[c.code] ?? 1)]),
    ),
  )
  const [ratesSaved, setRatesSaved] = useState(false)

  const dirty = name !== settings.name || currency !== settings.baseCurrency

  const save = () => {
    const patch: Partial<typeof settings> = { name: name.trim(), baseCurrency: currency }
    // Reset rates to sensible defaults when the base currency changes.
    if (currency !== settings.baseCurrency) patch.exchangeRates = defaultRates(currency)
    updateSettings(patch)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  const saveRates = () => {
    const next: Record<CurrencyCode, number> = { ...settings.exchangeRates }
    for (const c of CURRENCIES) {
      if (c.code === settings.baseCurrency) {
        next[c.code] = 1
        continue
      }
      const v = Number(rates[c.code])
      if (Number.isFinite(v) && v > 0) next[c.code] = v
    }
    updateSettings({ exchangeRates: next })
    setRatesSaved(true)
    window.setTimeout(() => setRatesSaved(false), 2000)
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
        <h2 className="card__title">Курси валют</h2>
        <p className="card__text">
          Ручні курси для перерахунку в базову валюту ({settings.baseCurrency}). Актуальні
          ринкові курси зʼявляться в наступному етапі (макродані).
        </p>
        {CURRENCIES.filter((c) => c.code !== settings.baseCurrency).map((c) => (
          <TextField
            key={c.code}
            label={`1 ${c.code} = ? ${settings.baseCurrency}`}
            inputMode="decimal"
            value={rates[c.code] ?? ''}
            onChange={(e) => setRates((r) => ({ ...r, [c.code]: e.target.value }))}
          />
        ))}
        <div className="card__actions">
          <Button onClick={saveRates}>Зберегти курси</Button>
          {ratesSaved && <span className="save-hint">Збережено ✓</span>}
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
