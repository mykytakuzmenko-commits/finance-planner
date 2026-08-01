import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { RouterProvider } from './router/Router'
import { SettingsProvider } from './state/SettingsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <RouterProvider>
        <App />
      </RouterProvider>
    </SettingsProvider>
  </StrictMode>,
)
