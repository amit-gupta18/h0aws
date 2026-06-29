'use client'

import { useState } from 'react'
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  type Expense,
  type CreateExpenseInput,
} from '@/hooks/useExpenses'
import { Button } from '@/components/ui/button'
import { Banknote, Plus, X, Pencil, Trash2 } from 'lucide-react'

const CATEGORY_PRESETS = ['Rent', 'Salary', 'Utilities', 'Transport', 'Supplies', 'Other']

const emptyForm = (): CreateExpenseInput => ({
  category: '',
  amount: 0,
  expenseDate: new Date().toISOString().split('T')[0]!,
  description: '',
})

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)
}

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateExpenseInput>(emptyForm())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useExpenses({
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: 50,
  })
  const expenses = data?.data ?? []

  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id)
    setForm({
      category: expense.category,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      description: expense.description ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      category: form.category,
      amount: form.amount,
      expenseDate: form.expenseDate,
      description: form.description || undefined,
    }

    if (editingId) {
      await updateExpense.mutateAsync({ id: editingId, data: payload })
    } else {
      await createExpense.mutateAsync(payload)
    }
    closeForm()
  }

  async function handleDelete(id: string) {
    await deleteExpense.mutateAsync(id)
    setDeleteConfirmId(null)
  }

  const isPending = createExpense.isPending || updateExpense.isPending
  const formError = createExpense.error ?? updateExpense.error

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} expense{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate} className="h-9 w-full shrink-0 gap-2 whitespace-nowrap sm:w-auto">
          <Plus size={15} /> Add Expense
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? 'Edit Expense' : 'New Expense'}
            </h2>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Category *</label>
              <input
                required
                list="expense-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Rent"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
              />
              <datalist id="expense-categories">
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1 pt-1">
                {CATEGORY_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Amount (₹) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Date *</label>
              <input
                required
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Description</label>
              <input
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional notes"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
              />
            </div>
            {formError && (
              <div className="sm:col-span-2 text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {formError.message}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeForm} className="h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-9">
                {isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category or description…"
            className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm"
          />
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          title="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          title="To date"
        />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Banknote size={32} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No expenses found.</p>
            {!search && !from && !to && (
              <button onClick={openCreate} className="text-sm text-primary font-medium hover:underline mt-2">
                Add your first expense →
              </button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Category</th>
                <th className="px-4 py-2.5 text-left font-medium">Description</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 text-muted-foreground">{expense.expenseDate}</td>
                  <td className="px-4 py-3 font-medium">{expense.category}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                    {expense.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(expense.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(expense)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {deleteConfirmId === expense.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(expense.id)}
                            className="text-xs text-destructive hover:underline"
                            disabled={deleteExpense.isPending}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(expense.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
