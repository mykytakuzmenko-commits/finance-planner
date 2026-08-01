export interface MonthReport {
  month: string
  plannedIncome: number
  actualIncome: number
  plannedExpense: number
  actualExpense: number
  actualSavings: number
  topCategories: { name: string; actual: number }[]
  closedAt: string
}

const KEY = 'pfp.reports.v1'

type ReportMap = Record<string, MonthReport>

function loadAll(): ReportMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ReportMap) : {}
  } catch {
    return {}
  }
}

function saveAll(map: ReportMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function getReport(month: string): MonthReport | null {
  return loadAll()[month] ?? null
}

export function closeMonth(report: MonthReport): void {
  const map = loadAll()
  map[report.month] = report
  saveAll(map)
}

export function reopenMonth(month: string): void {
  const map = loadAll()
  delete map[month]
  saveAll(map)
}
