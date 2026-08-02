import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { AppRoot } from './AppRoot.tsx'
import { AuthProvider } from './state/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerServiceWorker } from './registerSW'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

registerServiceWorker()
