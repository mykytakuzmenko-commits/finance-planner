interface KpiCardProps {
  label: string
  value: string
  tone?: 'default' | 'income' | 'expense'
}

export function KpiCard({ label, value, tone = 'default' }: KpiCardProps) {
  return (
    <div className={`kpi kpi--${tone}`}>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
    </div>
  )
}
