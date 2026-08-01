import { addMonths, formatMonth } from '../../utils/month'

interface MonthSwitcherProps {
  month: string
  onChange: (month: string) => void
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  return (
    <div className="month-switcher">
      <button
        type="button"
        className="icon-btn"
        aria-label="Попередній місяць"
        onClick={() => onChange(addMonths(month, -1))}
      >
        ‹
      </button>
      <span className="month-switcher__label">{formatMonth(month)}</span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Наступний місяць"
        onClick={() => onChange(addMonths(month, 1))}
      >
        ›
      </button>
    </div>
  )
}
