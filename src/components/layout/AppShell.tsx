import type { ReactNode } from 'react'
import { Link, useRouter } from '../../router/Router'
import { NAV_ITEMS } from '../../constants/nav'
import { Icon } from '../ui/Icon'
import { useSettings } from '../../state/SettingsContext'
import { getCurrency } from '../../constants/currencies'

interface AppShellProps {
  title: string
  children: ReactNode
}

function isActive(current: string, path: string): boolean {
  if (path === '/') return current === '/'
  return current === path || current.startsWith(`${path}/`)
}

export function AppShell({ title, children }: AppShellProps) {
  const { path } = useRouter()
  const { settings } = useSettings()
  const currency = getCurrency(settings.baseCurrency)

  return (
    <div className="shell">
      {/* Desktop sidebar */}
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-mark" aria-hidden="true">
            ₴
          </span>
          <span className="shell__brand-text">Finance Planner</span>
        </div>
        <nav className="shell__nav" aria-label="Основна навігація">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(path, item.path) ? 'nav-link--active' : ''}`}
              aria-current={isActive(path, item.path) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="shell__sidebar-foot">
          <span className="shell__currency">
            Валюта: <strong>{currency.code}</strong> {currency.symbol}
          </span>
        </div>
      </aside>

      {/* Main column */}
      <div className="shell__main">
        <header className="shell__topbar">
          <span className="shell__topbar-brand" aria-hidden="true">
            ₴
          </span>
          <h1 className="shell__title">{title}</h1>
          <span className="shell__topbar-currency">{currency.code}</span>
          <Link
            to="/settings"
            className="shell__topbar-settings"
            aria-label="Налаштування"
          >
            <Icon name="settings" size={20} />
          </Link>
        </header>

        <main className="shell__content">{children}</main>
      </div>

      {/* Mobile bottom navigation (settings lives in the top bar to keep this compact) */}
      <nav className="shell__mobilenav" aria-label="Основна навігація">
        {NAV_ITEMS.filter((item) => item.path !== '/settings').map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobilenav-link ${isActive(path, item.path) ? 'mobilenav-link--active' : ''}`}
            aria-current={isActive(path, item.path) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
