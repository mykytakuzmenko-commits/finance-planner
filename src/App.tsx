import type { ReactNode } from 'react'
import { useRouter } from './router/Router'
import { useSettings } from './state/SettingsContext'
import { AppShell } from './components/layout/AppShell'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { PlanningPage } from './pages/PlanningPage'
import { WeeklyPage } from './pages/WeeklyPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { SavingsPage } from './pages/SavingsPage'
import { SettingsPage } from './pages/SettingsPage'

interface RouteDef {
  title: string
  element: ReactNode
}

const ROUTES: Record<string, RouteDef> = {
  '/': { title: 'Дашборд', element: <DashboardPage /> },
  '/transactions': { title: 'Операції', element: <TransactionsPage /> },
  '/planning': { title: 'Планування', element: <PlanningPage /> },
  '/weekly': { title: 'Тижневий бюджет', element: <WeeklyPage /> },
  '/analysis': { title: 'Аналітика', element: <AnalysisPage /> },
  '/savings': { title: 'Заощадження', element: <SavingsPage /> },
  '/settings': { title: 'Налаштування', element: <SettingsPage /> },
}

function App() {
  const { settings } = useSettings()
  const { path } = useRouter()

  if (!settings.onboarded) {
    return <OnboardingPage />
  }

  const route = ROUTES[path] ?? ROUTES['/']

  return <AppShell title={route.title}>{route.element}</AppShell>
}

export default App
