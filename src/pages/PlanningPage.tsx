import { EmptyState } from '../components/ui/EmptyState'

export function PlanningPage() {
  return (
    <div className="page">
      <EmptyState
        icon="planning"
        title="Планування ще не налаштоване"
        description="Місячні періоди, планові доходи й витрати та регулярні шаблони зʼявляться на етапі Milestone 3."
      />
    </div>
  )
}
