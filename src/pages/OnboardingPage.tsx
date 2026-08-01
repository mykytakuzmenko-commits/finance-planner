import { useState } from 'react'
import { useSettings } from '../state/SettingsContext'
import { CURRENCIES } from '../constants/currencies'
import type { CurrencyCode } from '../types/settings'
import { defaultRates } from '../utils/rates'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { Icon } from '../components/ui/Icon'

const TOTAL_STEPS = 3

export function OnboardingPage() {
  const { updateSettings } = useSettings()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('UAH')

  const finish = () => {
    updateSettings({
      onboarded: true,
      name: name.trim(),
      baseCurrency: currency,
      exchangeRates: defaultRates(currency),
    })
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <div className="onboarding__progress" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`onboarding__dot ${i + 1 <= step ? 'is-on' : ''}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="onboarding__step">
            <div className="onboarding__badge" aria-hidden="true">
              ₴
            </div>
            <h1>Вітаємо у Finance Planner</h1>
            <p className="onboarding__lead">
              Особистий фінансовий планер: рахунки, доходи й витрати, місячне
              планування, прогнози та заощадження. Усі ваші фінансові дані
              зберігаються лише на цьому пристрої.
            </p>
            <Button fullWidth onClick={() => setStep(2)}>
              Почати
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding__step">
            <h1>Трохи про вас</h1>
            <p className="onboarding__lead">
              Як до вас звертатися та в якій валюті вести облік? Це можна
              змінити пізніше в налаштуваннях.
            </p>
            <TextField
              label="Ім'я (необовʼязково)"
              placeholder="Напр., Микита"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="field">
              <span className="field__label">Основна валюта</span>
              <div className="currency-choice">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className={`currency-option ${currency === c.code ? 'is-selected' : ''}`}
                    onClick={() => setCurrency(c.code)}
                    aria-pressed={currency === c.code}
                  >
                    <span className="currency-option__symbol">{c.symbol}</span>
                    <span className="currency-option__code">{c.code}</span>
                    <span className="currency-option__label">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="onboarding__actions">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Назад
              </Button>
              <Button onClick={() => setStep(3)}>Далі</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding__step">
            <div className="onboarding__badge onboarding__badge--ok" aria-hidden="true">
              <Icon name="check" size={30} />
            </div>
            <h1>Все готово{name.trim() ? `, ${name.trim()}` : ''}!</h1>
            <p className="onboarding__lead">
              Обрана валюта — <strong>{currency}</strong>. Далі ви потрапите на
              дашборд. Рахунки й транзакції зʼявляться на наступному етапі.
            </p>
            <div className="onboarding__actions">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Назад
              </Button>
              <Button onClick={finish}>Перейти до дашборду</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
