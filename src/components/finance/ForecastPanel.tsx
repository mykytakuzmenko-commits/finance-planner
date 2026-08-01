import type { CurrencyCode } from '../../types/settings'
import { formatMoney } from '../../utils/money'

interface ForecastRow {
  label: string
  hint: string
  value: number
  tone: 'guaranteed' | 'weighted' | 'optimistic'
}

interface ForecastPanelProps {
  guaranteed: number
  weighted: number
  optimistic: number
  currency: CurrencyCode
}

/** Projected end-of-month balance under three income assumptions. */
export function ForecastPanel({
  guaranteed,
  weighted,
  optimistic,
  currency,
}: ForecastPanelProps) {
  const rows: ForecastRow[] = [
    { label: 'Гарантований', hint: 'лише певні доходи', value: guaranteed, tone: 'guaranteed' },
    { label: 'Зважений', hint: 'з урахуванням ймовірностей', value: weighted, tone: 'weighted' },
    { label: 'Оптимістичний', hint: 'усі заплановані доходи', value: optimistic, tone: 'optimistic' },
  ]
  const max = Math.max(optimistic, guaranteed, 1)

  return (
    <div className="forecast">
      {rows.map((r) => {
        const negative = r.value < 0
        const width = negative ? 0 : `${(r.value / max) * 100}%`
        return (
          <div key={r.tone} className="forecast__row">
            <div className="forecast__meta">
              <span className="forecast__label">{r.label}</span>
              <span className="forecast__hint">{r.hint}</span>
            </div>
            <div className="forecast__track">
              <div
                className={`forecast__fill forecast__fill--${r.tone} ${negative ? 'is-negative' : ''}`}
                style={{ width }}
              />
            </div>
            <span className={`forecast__value ${negative ? 'is-negative' : ''}`}>
              {formatMoney(r.value, currency)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
