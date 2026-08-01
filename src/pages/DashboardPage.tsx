import { useSettings } from '../state/SettingsContext'
import { EmptyState } from '../components/ui/EmptyState'

export function DashboardPage() {
  const { settings } = useSettings()
  const greeting = settings.name ? `Вітаємо, ${settings.name}!` : 'Вітаємо!'

  return (
    <div className="page">
      <p className="page__greeting">{greeting}</p>
      <EmptyState
        icon="dashboard"
        title="Дашборд поки порожній"
        description="Тут зʼявляться баланс, доходи, витрати, прогноз залишку та safe-to-spend — щойно ви додасте рахунки й транзакції на наступному етапі."
      />
    </div>
  )
}
