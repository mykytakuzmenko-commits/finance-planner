import { Cell, Pie, PieChart } from 'recharts'
import type { CurrencyCode } from '../../types/settings'
import type { CategorySlice } from '../../calculations/charts'
import { EmptyState } from '../ui/EmptyState'

const COLORS = ['#4ade80', '#38bdf8', '#a78bfa', '#fbbf24', '#f87171', '#34d399', '#f472b6', '#94a3b8']

interface Props {
  data: CategorySlice[]
  currency: CurrencyCode
}

export function ExpenseDonut({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon="analysis"
        title="Немає витрат цього місяця"
        description="Додайте витрати, щоб побачити їхній розподіл за категоріями."
      />
    )
  }

  const slices = data.slice(0, 8)
  const total = data.reduce((a, s) => a + s.value, 0)

  return (
    <div className="donut">
      <div className="donut__chart">
        <PieChart width={170} height={170}>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            cx={85}
            cy={85}
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
        <div className="donut__center">
          <span className="donut__center-val">{total.toLocaleString('uk-UA')}</span>
          <span className="donut__center-cur">{currency}</span>
        </div>
      </div>
      <ul className="donut__legend">
        {slices.map((s, i) => (
          <li key={s.name}>
            <i className="dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="donut__name">{s.name}</span>
            <span className="donut__pct">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
