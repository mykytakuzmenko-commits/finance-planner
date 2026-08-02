import type { Insight } from '../../calculations/insights'

/** Compact row of "at a glance" trend chips shown on the dashboard. */
export function InsightsStrip({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null
  return (
    <div className="insights">
      {insights.map((i) => (
        <div key={i.id} className={`insight insight--${i.tone}`}>
          <span className="insight__label">{i.label}</span>
          <span className="insight__value">
            <span className="insight__mark">{i.mark}</span> {i.value}
          </span>
        </div>
      ))}
    </div>
  )
}
