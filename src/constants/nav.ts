import type { IconName } from '../components/ui/Icon'

export interface NavItem {
  path: string
  label: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Дашборд', icon: 'dashboard' },
  { path: '/transactions', label: 'Операції', icon: 'transactions' },
  { path: '/planning', label: 'Планування', icon: 'planning' },
  { path: '/weekly', label: 'Тиждень', icon: 'week' },
  { path: '/analysis', label: 'Аналітика', icon: 'analysis' },
  { path: '/savings', label: 'Заощадження', icon: 'savings' },
  { path: '/macro', label: 'Макро', icon: 'macro' },
  { path: '/settings', label: 'Налаштування', icon: 'settings' },
]
