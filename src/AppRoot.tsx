import { useAuth } from './state/AuthContext'
import { AuthPage } from './pages/AuthPage'
import App from './App'
import { RouterProvider } from './router/Router'
import { SettingsProvider } from './state/SettingsContext'
import { DataProvider } from './state/DataContext'
import { PlanningProvider } from './state/PlanningContext'
import { WeeklyBudgetProvider } from './state/WeeklyBudgetContext'
import { SavingsGoalsProvider } from './state/SavingsGoalsContext'
import { MacroProvider } from './state/MacroContext'

export function AppRoot() {
  const { loading, session } = useAuth()

  if (loading) {
    return <div className="app-loader">Завантаження…</div>
  }
  if (!session) {
    return <AuthPage />
  }

  return (
    <SettingsProvider>
      <DataProvider>
        <PlanningProvider>
          <WeeklyBudgetProvider>
            <SavingsGoalsProvider>
              <MacroProvider>
                <RouterProvider>
                  <App />
                </RouterProvider>
              </MacroProvider>
            </SavingsGoalsProvider>
          </WeeklyBudgetProvider>
        </PlanningProvider>
      </DataProvider>
    </SettingsProvider>
  )
}
