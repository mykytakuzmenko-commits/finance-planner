import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CurrencyCode } from '../../types/settings'
import type { CashFlowPoint } from '../../calculations/charts'

interface Props {
  data: CashFlowPoint[]
  currency: CurrencyCode
}

const fmt = (v: number, cur: CurrencyCode) =>
  `${v.toLocaleString('uk-UA')} ${cur}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  const get = (k: string) => payload.find((p: any) => p.dataKey === k)?.value ?? 0
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{label}</div>
      <div className="chart-tooltip__row">
        <span className="dot" style={{ background: '#4ade80' }} /> Доходи: {fmt(get('income'), currency)}
      </div>
      <div className="chart-tooltip__row">
        <span className="dot" style={{ background: '#f87171' }} /> Витрати: {fmt(get('expense'), currency)}
      </div>
      <div className="chart-tooltip__row">
        <span className="dot" style={{ background: '#a78bfa' }} /> Чистий: {fmt(get('net'), currency)}
      </div>
    </div>
  )
}

export function CashFlowChart({ data, currency }: Props) {
  const hasCurrent = data.some((d) => d.isCurrent)
  return (
    <div className="chart-box">
      <div className="chart-legend">
        <span><i className="dot" style={{ background: '#4ade80' }} /> Доходи</span>
        <span><i className="dot" style={{ background: '#f87171' }} /> Витрати</span>
        <span><i className="dot" style={{ background: '#a78bfa' }} /> Чистий прибуток</span>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#2a2f45" vertical={false} />
          <XAxis dataKey="label" stroke="#6b7391" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            stroke="#6b7391"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={44}
            tickFormatter={(v: number) =>
              Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}к` : `${v}`
            }
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            content={<CustomTooltip currency={currency} />}
          />
          <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fillOpacity={d.isCurrent ? 0.4 : 1} />
            ))}
          </Bar>
          <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.month} fillOpacity={d.isCurrent ? 0.4 : 1} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="net"
            stroke="#a78bfa"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) => {
              const { cx, cy, payload, index } = props as {
                cx: number
                cy: number
                index: number
                payload: CashFlowPoint
              }
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload.isCurrent ? '#1a1f36' : '#a78bfa'}
                  stroke="#a78bfa"
                  strokeWidth={payload.isCurrent ? 2 : 0}
                />
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {hasCurrent && (
        <p className="chart-note">
          Останній місяць ще триває — дані накопичуються.
        </p>
      )}
    </div>
  )
}
