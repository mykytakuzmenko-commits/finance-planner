import { EmptyState } from '../components/ui/EmptyState'

export function AnalysisPage() {
  return (
    <div className="page">
      <EmptyState
        icon="analysis"
        title="Даних для аналітики поки немає"
        description="План-факт аналіз, відхилення за доходами й витратами та розбивка за категоріями зʼявляться на етапі Milestone 4."
      />
    </div>
  )
}
