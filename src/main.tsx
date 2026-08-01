import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { RouterProvider } from './router/Router'
import { SettingsProvider } from './state/SettingsContext'
import { DataProvider } from './state/DataContext'
import { PlanningProvider } from './state/PlanningContext'
import { WeeklyBudgetProvider } from './state/WeeklyBudgetContext'
import { SavingsGoalsProvider } from './state/SavingsGoalsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <DataProvider>
        <PlanningProvider>
          <WeeklyBudgetProvider>
            <SavingsGoalsProvider>
              <RouterProvider>
                <App />
              </RouterProvider>
            </SavingsGoalsProvider>
          </WeeklyBudgetProvider>
        </PlanningProvider>
      </DataProvider>
    </SettingsProvider>
  </StrictMode>,
)
