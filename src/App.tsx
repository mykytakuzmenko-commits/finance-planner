import { lazy, Suspense, type ReactNode } from 'react'
import { useRouter } from './router/Router'
import { useSettings } from './state/SettingsContext'
import { AppShell } from './components/layout/AppShell'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'

// Landing (Dashboard) and Onboarding stay eager; the rest split into their own
// chunks loaded on navigation, keeping the initial bundle lean.
const TransactionsPage = lazy(() =>
  import('./pages/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
)
const PlanningPage = lazy(() =>
  import('./pages/PlanningPage').then((m) => ({ default: m.PlanningPage })),
)
const WeeklyPage = lazy(() => import('./pages/WeeklyPage').then((m) => ({ default: m.WeeklyPage })))
const AnalysisPage = lazy(() =>
  import('./pages/AnalysisPage').then((m) => ({ default: m.AnalysisPage })),
)
const SavingsPage = lazy(() =>
  import('./pages/SavingsPage').then((m) => ({ default: m.SavingsPage })),
)
const MacroPage = lazy(() => import('./pages/MacroPage').then((m) => ({ default: m.MacroPage })))
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

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
  '/macro': { title: 'Макроекономіка', element: <MacroPage /> },
  '/profile': { title: 'Профіль', element: <ProfilePage /> },
  '/settings': { title: 'Налаштування', element: <SettingsPage /> },
}

function App() {
  const { settings, loading } = useSettings()
  const { path } = useRouter()

  if (loading) {
    return <div className="app-loader">Завантаження…</div>
  }
  if (!settings.onboarded) {
    return <OnboardingPage />
  }

  const route = ROUTES[path] ?? ROUTES['/']

  return (
    <AppShell title={route.title}>
      <Suspense fallback={<div className="page__loading">Завантаження…</div>}>
        {route.element}
      </Suspense>
    </AppShell>
  )
}

export default App
