/** Today's date as an ISO YYYY-MM-DD string in local time. */
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Format an ISO date as a localized human string, e.g. "1 серп. 2026". */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/** Localized day + month only, e.g. "2 вер." */
export function formatDayMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(d)
}

/** Shift an ISO date by n days, returning a new ISO YYYY-MM-DD string. */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Whole days from ISO date a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime()
  const db = new Date(`${b}T00:00:00`).getTime()
  return Math.round((db - da) / 86_400_000)
}
