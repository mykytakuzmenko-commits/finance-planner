import { STORES, bulkPut, clearStore, getAll, type StoreName } from '../db/database'

const APP_ID = 'personal-finance-planner'
const BACKUP_VERSION = 1
const SETTINGS_KEY = 'pfp.settings.v1'
const LAST_BACKUP_KEY = 'pfp.lastBackup'

const STORE_NAMES = Object.values(STORES) as StoreName[]

export interface BackupFile {
  app: string
  version: number
  exportedAt: string
  settings: unknown
  data: Record<StoreName, unknown[]>
}

/** Read all data + settings into a plain object. */
export async function buildBackup(): Promise<BackupFile> {
  const data = {} as Record<StoreName, unknown[]>
  for (const name of STORE_NAMES) {
    data[name] = await getAll<unknown>(name)
  }
  let settings: unknown = null
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    settings = raw ? JSON.parse(raw) : null
  } catch {
    settings = null
  }
  return {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    data,
  }
}

export function setLastBackup(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  } catch {
    /* ignore */
  }
}

export function getLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

export class BackupValidationError extends Error {}

/**
 * Parse and validate a backup file WITHOUT touching current data. Throws
 * BackupValidationError on any problem, so a corrupted file can never delete
 * existing data — the caller only writes after this returns successfully.
 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupValidationError('Файл не є коректним JSON.')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BackupValidationError('Невідомий формат файлу.')
  }
  const obj = parsed as Partial<BackupFile>
  if (obj.app !== APP_ID) {
    throw new BackupValidationError('Це не резервна копія цього застосунку.')
  }
  if (!obj.data || typeof obj.data !== 'object') {
    throw new BackupValidationError('У файлі відсутній розділ даних.')
  }
  // Every known store must be present and be an array.
  for (const name of STORE_NAMES) {
    const v = (obj.data as Record<string, unknown>)[name]
    if (!Array.isArray(v)) {
      throw new BackupValidationError(`Пошкоджений або неповний розділ «${name}».`)
    }
  }
  return obj as BackupFile
}

/** Replace all data with a validated backup. Call parseBackup first. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  for (const name of STORE_NAMES) {
    await clearStore(name)
    await bulkPut(name, backup.data[name] as object[])
  }
  if (backup.settings && typeof backup.settings === 'object') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings))
    } catch {
      /* ignore */
    }
  }
}

/** Trigger a download of the current data as a JSON backup file. */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `finance-backup-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  setLastBackup()
}
