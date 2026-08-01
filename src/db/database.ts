const DB_NAME = 'pfp'
const DB_VERSION = 4

export const STORES = {
  accounts: 'accounts',
  categories: 'categories',
  transactions: 'transactions',
  planTemplates: 'planTemplates',
  planItems: 'planItems',
  planMonths: 'planMonths',
  weeklyBudgets: 'weeklyBudgets',
  savingsGoals: 'savingsGoals',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          // planMonths is keyed by its month string; everything else by id.
          const keyPath = name === STORES.planMonths ? 'month' : 'id'
          db.createObjectStore(name, { keyPath })
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(
  db: IDBDatabase,
  store: StoreName,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store)
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readonly').getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function putRecord<T>(store: StoreName, value: T): Promise<T> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').put(value)
    req.onsuccess = () => resolve(value)
    req.onerror = () => reject(req.error)
  })
}

export async function bulkPut<T>(store: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite')
    const os = t.objectStore(store)
    for (const v of values) os.put(v)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function bulkDelete(store: StoreName, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite')
    const os = t.objectStore(store)
    for (const id of ids) os.delete(id)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
