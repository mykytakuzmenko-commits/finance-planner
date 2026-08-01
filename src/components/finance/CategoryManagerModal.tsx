import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useData } from '../../state/DataContext'
import type { Category, CategoryKind } from '../../types/finance'

interface CategoryManagerModalProps {
  open: boolean
  onClose: () => void
}

export function CategoryManagerModal({ open, onClose }: CategoryManagerModalProps) {
  const { categories, addCategory, deleteCategory } = useData()
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [name, setName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)

  const list = categories
    .filter((c) => c.kind === kind)
    .sort((a, b) => a.createdAt - b.createdAt)

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    await addCategory({ name: trimmed, kind })
    setName('')
  }

  return (
    <Modal open={open} title="Категорії" onClose={onClose}>
      <div className="segmented" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'expense'}
          className={`segmented__item ${kind === 'expense' ? 'is-active' : ''} segmented__item--expense`}
          onClick={() => setKind('expense')}
        >
          Витрати
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'income'}
          className={`segmented__item ${kind === 'income' ? 'is-active' : ''} segmented__item--income`}
          onClick={() => setKind('income')}
        >
          Доходи
        </button>
      </div>

      <div className="cat-add">
        <input
          className="field__input"
          placeholder="Нова категорія"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <Button onClick={add} disabled={!name.trim()}>
          Додати
        </Button>
      </div>

      <ul className="cat-list">
        {list.length === 0 && <li className="cat-list__empty">Категорій ще немає.</li>}
        {list.map((c) => (
          <li key={c.id} className="cat-list__item">
            <span>{c.name}</span>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label={`Видалити категорію ${c.name}`}
              onClick={() => setPendingDelete(c)}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Видалити категорію?"
        message={`Категорію «${pendingDelete?.name}» буде видалено. Повʼязані операції залишаться, але стануть без категорії.`}
        confirmLabel="Видалити"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteCategory(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </Modal>
  )
}
