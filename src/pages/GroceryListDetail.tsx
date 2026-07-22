import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddItemForm } from '../components/grocery/AddItemForm'
import { PricePromptModal } from '../components/grocery/PricePromptModal'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { useGroceryLists } from '../hooks/useGroceryLists'
import { formatCurrency } from '../lib/format'
import type { GroceryItem } from '../types/database'

export function GroceryListDetailPage() {
  const { listId } = useParams<{ listId: string }>()
  const { lists, loading: listsLoading } = useGroceryLists()
  const {
    items,
    loading: itemsLoading,
    error,
    online,
    pendingIds,
    total,
    checkedCount,
    addItem,
    setChecked,
    removeItem,
  } = useGroceryItems(listId ?? null)
  const [pricePromptFor, setPricePromptFor] = useState<GroceryItem | null>(null)

  const list = lists.find((l) => l.id === listId)

  function handleToggle(item: GroceryItem) {
    if (item.checked) {
      // Unchecking clears the price too — it'll be re-prompted if checked again.
      void setChecked(item.id, false, null)
    } else {
      setPricePromptFor(item)
    }
  }

  async function handleRemove(item: GroceryItem) {
    if (!window.confirm(`Remove "${item.name}"?`)) return
    await removeItem(item.id)
  }

  return (
    <div>
      <Link
        to="/grocery"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        ← All lists
      </Link>

      <PageHeader
        title={list?.name ?? (listsLoading ? 'Loading…' : 'List not found')}
        description={
          items.length === 0
            ? undefined
            : `${checkedCount} of ${items.length} checked · Total ${formatCurrency(total)}${
                online ? '' : ' · Offline — changes will sync when you\'re back online'
              }`
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      <div className="mb-4">
        <AddItemForm onSubmit={addItem} />
      </div>

      {itemsLoading && items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading items…</p>
      ) : items.length === 0 ? (
        <EmptyState message="No items yet. Add your first grocery item above." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item)}
                className="h-5 w-5 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                aria-label={`Mark ${item.name} as ${item.checked ? 'unchecked' : 'checked'}`}
              />
              <span
                className={
                  'min-w-0 flex-1 truncate text-sm ' +
                  (item.checked
                    ? 'text-slate-400 line-through dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100')
                }
              >
                {item.name}
                {pendingIds.has(item.id) ? (
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">(not synced)</span>
                ) : null}
              </span>
              {item.checked && item.price != null && (
                <span className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatCurrency(item.price)}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleRemove(item)}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {pricePromptFor && (
        <PricePromptModal
          itemName={pricePromptFor.name}
          onConfirm={(price) => {
            void setChecked(pricePromptFor.id, true, price)
            setPricePromptFor(null)
          }}
          onCancel={() => setPricePromptFor(null)}
        />
      )}
    </div>
  )
}
