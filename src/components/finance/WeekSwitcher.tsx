import { addWeeks, formatWeek } from '../../utils/week'

interface WeekSwitcherProps {
  weekStart: string
  onChange: (weekStart: string) => void
}

export function WeekSwitcher({ weekStart, onChange }: WeekSwitcherProps) {
  return (
    <div className="month-switcher">
      <button
        type="button"
        className="icon-btn"
        aria-label="Попередній тиждень"
        onClick={() => onChange(addWeeks(weekStart, -1))}
      >
        ‹
      </button>
      <span className="month-switcher__label">{formatWeek(weekStart)}</span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Наступний тиждень"
        onClick={() => onChange(addWeeks(weekStart, 1))}
      >
        ›
      </button>
    </div>
  )
}
