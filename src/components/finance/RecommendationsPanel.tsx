import { useSettings } from '../../state/SettingsContext'
import { formatMoney } from '../../utils/money'
import type { Confidence, Recommendation } from '../../types/recommendation'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'Висока впевненість',
  medium: 'Середня впевненість',
  low: 'Низька впевненість',
}

export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  const { settings } = useSettings()
  const currency = settings.baseCurrency

  if (recommendations.length === 0) return null

  const fmt = (r: Recommendation) => {
    const cur = r.currency ?? currency
    if (r.range) return `${formatMoney(r.range[0], cur)} – ${formatMoney(r.range[1], cur)}`
    if (r.amount !== undefined) return formatMoney(r.amount, cur)
    return null
  }

  return (
    <section className="section">
      <h2 className="section__title">Поради</h2>
      <ul className="reco-list">
        {recommendations.map((r) => {
          const amount = fmt(r)
          return (
            <li key={r.id} className={`reco reco--${r.category}`}>
              <div className="reco__head">
                <span className="reco__title">{r.title}</span>
                <span className={`conf-badge conf-badge--${r.confidence}`}>
                  {CONFIDENCE_LABEL[r.confidence]}
                </span>
              </div>
              <p className="reco__reason">{r.reason}</p>
              {r.action && <p className="reco__action">{r.action}</p>}
              {amount && (
                <p className="reco__amount">
                  Орієнтир: <strong>{amount}</strong>
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="reco__disclaimer">
        Це не інвестиційна порада. Рекомендації — орієнтир на основі ваших власних даних;
        фінансові рішення приймаєте ви.
      </p>
    </section>
  )
}
