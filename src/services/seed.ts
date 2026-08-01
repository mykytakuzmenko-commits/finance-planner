import type { Category, CategoryKind } from '../types/finance'
import { createId } from '../utils/id'

const DEFAULT_CATEGORY_NAMES: Record<CategoryKind, string[]> = {
  income: ['Зарплата', 'Аванс', 'Бонус', 'Інші доходи'],
  expense: [
    'Продукти',
    'Кафе та ресторани',
    'Транспорт',
    'Житло',
    'Розваги',
    "Здоров'я",
    'Одяг',
    'Інше',
  ],
}

/** Build the default set of categories for a first-run user. */
export function buildDefaultCategories(): Category[] {
  const now = Date.now()
  const categories: Category[] = []
  let order = 0
  for (const kind of ['income', 'expense'] as CategoryKind[]) {
    for (const name of DEFAULT_CATEGORY_NAMES[kind]) {
      categories.push({
        id: createId(),
        name,
        kind,
        createdAt: now + order++,
      })
    }
  }
  return categories
}
