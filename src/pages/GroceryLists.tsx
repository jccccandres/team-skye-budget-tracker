import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GroceryListForm } from '../components/grocery/GroceryListForm'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { Modal } from '../components/ui/Modal'
import { PageHeader, PrimaryButton, SecondaryButton } from '../components/ui/PageHeader'
import { useGroceryLists } from '../hooks/useGroceryLists'
import { formatDate } from '../lib/format'
import type { GroceryList } from '../types/database'

export function GroceryListsPage() {
  const { lists, loading, error, online, pendingIds, create, update, remove } = useGroceryLists()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<GroceryList | null>(null)

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(list: GroceryList) {
    if (!window.confirm(`Delete list "${list.name}"? This also removes its items.`)) return
    await remove(list.id)
  }

  return (
    <div>
      <PageHeader
        title="Grocery lists"
        description={
          online
            ? `${lists.length} list${lists.length === 1 ? '' : 's'}`
            : `${lists.length} list${lists.length === 1 ? '' : 's'} · Offline — changes will sync when you're back online`
        }
        action={
          <PrimaryButton
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
          >
            New list
          </PrimaryButton>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading && lists.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading grocery lists…</p>
      ) : lists.length === 0 ? (
        <EmptyState message="No grocery lists yet. Create one to start planning your next shopping trip." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <Link to={`/grocery/${list.id}`} className="min-w-0">
                <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{list.name}</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Created {formatDate(list.created_at)}
                  {pendingIds.has(list.id) ? ' · Not synced yet' : ''}
                </p>
              </Link>
              <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryButton
                  onClick={() => {
                    setEditing(list)
                    setShowForm(true)
                  }}
                >
                  Rename
                </SecondaryButton>
                <SecondaryButton onClick={() => void handleDelete(list)}>Delete</SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Rename list' : 'New grocery list'} onClose={closeForm}>
          <GroceryListForm
            initial={editing ?? undefined}
            onSubmit={(name) => (editing ? update(editing.id, { name }) : create({ name }))}
            onCancel={closeForm}
          />
        </Modal>
      )}
    </div>
  )
}
