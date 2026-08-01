const MONTH_NAMES = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
]

/** Current month as 'YYYY-MM' in local time. */
export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Absolute month index (year * 12 + monthIndex) for ordering and arithmetic. */
export function monthAbs(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return y * 12 + (m - 1)
}

/** Shift a 'YYYY-MM' month by n (can be negative). */
export function addMonths(month: string, n: number): string {
  const abs = monthAbs(month) + n
  const y = Math.floor(abs / 12)
  const m = abs % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

/** Human label, e.g. 'Серпень 2026'. */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
