import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { RouterProvider } from './router/Router'
import { SettingsProvider } from './state/SettingsContext'
import { DataProvider } from './state/DataContext'
import { PlanningProvider } from './state/PlanningContext'
import { WeeklyBudgetProvider } from './state/WeeklyBudgetContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <DataProvider>
        <PlanningProvider>
          <WeeklyBudgetProvider>
            <RouterProvider>
              <App />
            </RouterProvider>
          </WeeklyBudgetProvider>
        </PlanningProvider>
      </DataProvider>
    </SettingsProvider>
  </StrictMode>,
)
