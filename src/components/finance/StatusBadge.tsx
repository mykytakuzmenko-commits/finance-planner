import type { FactStatus } from '../../calculations/planFact'

const LABELS: Record<FactStatus, string> = {
  'on-track': 'В нормі',
  warning: 'Увага',
  overspent: 'Перевитрата',
}

export function StatusBadge({ status }: { status: FactStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>
}
