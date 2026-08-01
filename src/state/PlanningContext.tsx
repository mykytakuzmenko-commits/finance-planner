import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  PlanCadence,
  PlanItem,
  PlanKind,
  PlanMonth,
  PlanScope,
  PlanTemplate,
} from '../types/planning'
import {
  STORES,
  bulkDelete,
  bulkPut,
  deleteRecord,
  getAll,
  putRecord,
} from '../db/database'
import { createId } from '../utils/id'
import { currentMonth, monthAbs } from '../utils/month'
import { generateItemsForMonth } from '../calculations/planning'

export type PlanRecurrence = 'once' | PlanCadence

export interface PlanItemInput {
  month: string
  kind: PlanKind
  name: string
  amount: number
  categoryId?: string
  probability?: number
  recurrence: PlanRecurrence
}

export interface PlanItemPatch {
  name: string
  amount: number
  categoryId?: string
  probability?: number
}

interface PlanningContextValue {
  loading: boolean
  templates: PlanTemplate[]
  items: PlanItem[]
  itemsForMonth: (month: string) => PlanItem[]
  ensureMonth: (month: string) => Promise<void>
  addItem: (input: PlanItemInput) => Promise<void>
  updateItem: (item: PlanItem, patch: PlanItemPatch, scope: PlanScope) => Promise<void>
  deleteItem: (item: PlanItem, scope: PlanScope) => Promise<void>
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<PlanTemplate[]>([])
  const [items, setItems] = useState<PlanItem[]>([])
  const [months, setMonths] = useState<string[]>([])

  // Latest snapshot for use inside async callbacks without stale closures.
  const ref = useRef({ templates, months })
  ref.current = { templates, months }

  // Prevents duplicate materialization of the same month under races.
  const inFlight = useRef(new Map<string, Promise<void>>())

  const materialize = useCallback(
    async (month: string, templatesSnapshot: PlanTemplate[]) => {
      const generated = generateItemsForMonth(month, templatesSnapshot)
      const record: PlanMonth = { month, createdAt: Date.now() }
      await Promise.all([
        putRecord(STORES.planMonths, record),
        bulkPut(STORES.planItems, generated),
      ])
      setMonths((prev) => (prev.includes(month) ? prev : [...prev, month]))
      if (generated.length > 0) setItems((prev) => [...prev, ...generated])
    },
    [],
  )

  const ensureMonth = useCallback(
    (month: string): Promise<void> => {
      if (ref.current.months.includes(month)) return Promise.resolve()
      const existing = inFlight.current.get(month)
      if (existing) return existing
      const p = materialize(month, ref.current.templates).finally(() => {
        inFlight.current.delete(month)
      })
      inFlight.current.set(month, p)
      return p
    },
    [materialize],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [tpls, its, mts] = await Promise.all([
          getAll<PlanTemplate>(STORES.planTemplates),
          getAll<PlanItem>(STORES.planItems),
          getAll<PlanMonth>(STORES.planMonths),
        ])
        if (cancelled) return
        const monthList = mts.map((m) => m.month)
        setTemplates(tpls)
        setItems(its)
        setMonths(monthList)

        // Auto-create the current month on first run of the period.
        const cm = currentMonth()
        if (!monthList.includes(cm)) {
          const generated = generateItemsForMonth(cm, tpls)
          await Promise.all([
            putRecord(STORES.planMonths, { month: cm, createdAt: Date.now() }),
            bulkPut(STORES.planItems, generated),
          ])
          if (cancelled) return
          setMonths((prev) => [...prev, cm])
          if (generated.length) setItems((prev) => [...prev, ...generated])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const addItem = useCallback(async (input: PlanItemInput) => {
    const base = {
      month: input.month,
      kind: input.kind,
      name: input.name,
      amount: input.amount,
      categoryId: input.categoryId,
      probability: input.kind === 'income' ? input.probability : undefined,
    }

    if (input.recurrence === 'once') {
      const item: PlanItem = { ...base, id: createId(), createdAt: Date.now() }
      await putRecord(STORES.planItems, item)
      setItems((prev) => [...prev, item])
      return
    }

    const template: PlanTemplate = {
      id: createId(),
      kind: input.kind,
      name: input.name,
      amount: input.amount,
      categoryId: input.categoryId,
      cadence: input.recurrence,
      probability: base.probability,
      startMonth: input.month,
      active: true,
      createdAt: Date.now(),
    }
    const item: PlanItem = {
      ...base,
      id: createId(),
      templateId: template.id,
      createdAt: Date.now(),
    }
    await Promise.all([
      putRecord(STORES.planTemplates, template),
      putRecord(STORES.planItems, item),
    ])
    setTemplates((prev) => [...prev, template])
    setItems((prev) => [...prev, item])
  }, [])

  const updateItem = useCallback(
    async (item: PlanItem, patch: PlanItemPatch, scope: PlanScope) => {
      const probability = item.kind === 'income' ? patch.probability : undefined

      // Single edit, or a one-time item: touch only this item.
      if (scope === 'single' || !item.templateId) {
        const updated: PlanItem = { ...item, ...patch, probability }
        await putRecord(STORES.planItems, updated)
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
        return
      }

      // This + all future: update the template and every materialized item
      // from it in this month or later. Past months stay untouched (history).
      const tpl = ref.current.templates.find((t) => t.id === item.templateId)
      const abs = monthAbs(item.month)
      const affected = items.filter(
        (i) => i.templateId === item.templateId && monthAbs(i.month) >= abs,
      )
      const updatedItems = affected.map((i) => ({ ...i, ...patch, probability }))

      const ops: Promise<unknown>[] = [bulkPut(STORES.planItems, updatedItems)]
      let newTpl: PlanTemplate | null = null
      if (tpl) {
        newTpl = {
          ...tpl,
          name: patch.name,
          amount: patch.amount,
          categoryId: patch.categoryId,
          probability,
        }
        ops.push(putRecord(STORES.planTemplates, newTpl))
      }
      await Promise.all(ops)

      const updatedIds = new Set(updatedItems.map((i) => i.id))
      const byId = new Map(updatedItems.map((i) => [i.id, i]))
      setItems((prev) => prev.map((i) => (updatedIds.has(i.id) ? byId.get(i.id)! : i)))
      if (newTpl) {
        const t = newTpl
        setTemplates((prev) => prev.map((x) => (x.id === t.id ? t : x)))
      }
    },
    [items],
  )

  const deleteItem = useCallback(
    async (item: PlanItem, scope: PlanScope) => {
      if (scope === 'single' || !item.templateId) {
        await deleteRecord(STORES.planItems, item.id)
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        return
      }

      // Stop recurring: deactivate the template and drop this + future items.
      const abs = monthAbs(item.month)
      const toDelete = items.filter(
        (i) => i.templateId === item.templateId && monthAbs(i.month) >= abs,
      )
      const tpl = ref.current.templates.find((t) => t.id === item.templateId)
      const ops: Promise<unknown>[] = [
        bulkDelete(
          STORES.planItems,
          toDelete.map((i) => i.id),
        ),
      ]
      let deactivated: PlanTemplate | null = null
      if (tpl) {
        deactivated = { ...tpl, active: false }
        ops.push(putRecord(STORES.planTemplates, deactivated))
      }
      await Promise.all(ops)

      const deletedIds = new Set(toDelete.map((i) => i.id))
      setItems((prev) => prev.filter((i) => !deletedIds.has(i.id)))
      if (deactivated) {
        const t = deactivated
        setTemplates((prev) => prev.map((x) => (x.id === t.id ? t : x)))
      }
    },
    [items],
  )

  const itemsForMonth = useCallback(
    (month: string) => items.filter((i) => i.month === month),
    [items],
  )

  const value = useMemo<PlanningContextValue>(
    () => ({
      loading,
      templates,
      items,
      itemsForMonth,
      ensureMonth,
      addItem,
      updateItem,
      deleteItem,
    }),
    [loading, templates, items, itemsForMonth, ensureMonth, addItem, updateItem, deleteItem],
  )

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanning(): PlanningContextValue {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error('usePlanning must be used within a PlanningProvider')
  return ctx
}
