import type { NetWorth } from '../../calculations/netWorth'
import type { CurrencyCode } from '../../types/settings'
import { formatMoney } from '../../utils/money'

const W = 100
const H = 32

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stroke = up ? '#4ade80' : '#f87171'
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - 3 - ((v - min) / span) * (H - 6)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg className="nw-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

interface Props {
  netWorth: NetWorth
  currency: CurrencyCode
}

export function NetWorthCard({ netWorth, currency }: Props) {
  const { current, liquid, savings, changeAmount, changePct } = netWorth
  const money = (m: number) => formatMoney(m, currency)
  const up = changeAmount >= 0

  return (
    <section className="section-card nw">
      <div className="nw__top">
        <div className="nw__headline">
          <span className="section__title nw__label">Чистий капітал</span>
          <span className="nw__value">{money(current)}</span>
          {changePct !== null && (
            <span className={`nw__change ${up ? 'is-up' : 'is-down'}`}>
              {up ? '↑' : '↓'} {money(Math.abs(changeAmount))} ({Math.abs(changePct).toFixed(1)}%) за місяць
            </span>
          )}
        </div>
        <Sparkline values={netWorth.trend} up={up} />
      </div>
      <div className="nw__split">
        <div className="nw__part">
          <span className="nw__part-label">Доступні кошти</span>
          <span className="nw__part-value">{money(liquid)}</span>
        </div>
        <div className="nw__part">
          <span className="nw__part-label">Заощадження</span>
          <span className="nw__part-value pos">{money(savings)}</span>
        </div>
      </div>
    </section>
  )
}
