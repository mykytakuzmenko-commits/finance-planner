import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
  message: string
}

/** Catches render-time errors and shows a recoverable fallback instead of a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Невідома помилка' }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept for debugging; not sent anywhere (no personal data leaves the device).
    console.error('App error:', error, info)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="error-screen">
        <div className="error-card">
          <h1>Щось пішло не так</h1>
          <p>
            Сталася помилка інтерфейсу. Ваші дані збережені локально й не втрачені. Спробуйте
            перезавантажити сторінку.
          </p>
          <p className="error-detail">{this.state.message}</p>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Перезавантажити
          </button>
        </div>
      </div>
    )
  }
}
