function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Monday (ISO) of the week containing `today` (or the current week). */
export function currentWeekStart(): string {
  const d = new Date()
  const diff = (d.getDay() + 6) % 7 // days since Monday (Mon=0 … Sun=6)
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff))
}

export function weekEnd(weekStart: string): string {
  const d = parseISO(weekStart)
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6))
}

export function addWeeks(weekStart: string, n: number): string {
  const d = parseISO(weekStart)
  return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7))
}

export function isInWeek(dateISO: string, weekStart: string): boolean {
  return dateISO >= weekStart && dateISO <= weekEnd(weekStart)
}

/** Days remaining in the week including today (0 if the week is over, 7 if it hasn't started). */
export function daysLeftInWeek(weekStart: string, todayISO: string): number {
  const end = weekEnd(weekStart)
  if (todayISO > end) return 0
  if (todayISO < weekStart) return 7
  const from = parseISO(todayISO)
  const to = parseISO(end)
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1
}

/** Human label, e.g. "4 серп. – 10 серп. 2026". */
export function formatWeek(weekStart: string): string {
  const fmt = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
  const start = parseISO(weekStart)
  const end = parseISO(weekEnd(weekStart))
  return `${fmt.format(start)} – ${fmt.format(end)} ${end.getFullYear()}`
}
