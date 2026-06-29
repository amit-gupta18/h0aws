'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useProductSearch, useCreateProduct, type Product } from '@/hooks/useProducts'
import {
  useInventoryTransactions,
  useAdjustStock,
  INVENTORY_TX_LABELS,
  type InventoryTxType,
} from '@/hooks/useInventory'
import { useActiveRole } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Box, Plus, X, SlidersHorizontal, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const GST_RATES = [0, 5, 12, 18, 28] as const

type Tab = 'products' | 'history'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const role = useActiveRole()
  const canEdit = role === 'OWNER' || role === 'ACCOUNTANT'

  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get('tab') === 'history' ? 'history' : 'products'
  )
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')

  const [historyProductId, setHistoryProductId] = useState('')
  const [historyType, setHistoryType] = useState<InventoryTxType | ''>('')

  useEffect(() => {
    setTab(searchParams.get('tab') === 'history' ? 'history' : 'products')
  }, [searchParams])

  const { data, isLoading } = useProductSearch(search)
  const products = data?.data ?? []

  const { data: historyData, isLoading: historyLoading } = useInventoryTransactions({
    limit: 50,
    productId: historyProductId || undefined,
    type: historyType || undefined,
  })
  const transactions = historyData?.data ?? []

  const createProduct = useCreateProduct()
  const adjustStock = useAdjustStock()

  const [form, setForm] = useState({
    name: '',
    sellingPrice: '',
    gstRate: '18' as string,
    unit: '',
    hsnCode: '',
    category: '',
    quantity: '',
    location: '',
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createProduct.mutateAsync({
      name: form.name,
      sellingPrice: parseFloat(form.sellingPrice),
      gstRate: parseInt(form.gstRate) as 0 | 5 | 12 | 18 | 28,
      unit: form.unit,
      hsnCode: form.hsnCode || undefined,
      category: form.category || undefined,
      quantity: form.quantity ? parseFloat(form.quantity) : undefined,
      location: form.location || undefined,
    })
    setForm({
      name: '',
      sellingPrice: '',
      gstRate: '18',
      unit: '',
      hsnCode: '',
      category: '',
      quantity: '',
      location: '',
    })
    setShowForm(false)
  }

  function openAdjust(product: Product) {
    setAdjustProduct(product)
    setAdjustQty('')
    setAdjustNotes('')
    adjustStock.reset()
  }

  function closeAdjust() {
    setAdjustProduct(null)
    setAdjustQty('')
    setAdjustNotes('')
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustProduct) return

    const quantityChange = parseFloat(adjustQty)
    if (!quantityChange || Number.isNaN(quantityChange)) return

    await adjustStock.mutateAsync({
      productId: adjustProduct.id,
      quantityChange,
      notes: adjustNotes.trim(),
    })
    closeAdjust()
  }

  const parsedAdjustQty = parseFloat(adjustQty)
  const projectedStock =
    adjustProduct && !Number.isNaN(parsedAdjustQty)
      ? adjustProduct.quantity + parsedAdjustQty
      : null

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Products, stock levels, and adjustment history
          </p>
        </div>
        {canEdit && tab === 'products' && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-9 w-full shrink-0 gap-2 whitespace-nowrap sm:w-auto"
          >
            <Plus size={15} /> Add Product
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setTab('products')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
            tab === 'products'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Box size={15} />
          Products
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
            tab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <History size={15} />
          Stock history
        </button>
      </div>

      {tab === 'products' && showForm && canEdit && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">New Product</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Product Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Basmati Rice 5kg"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Selling Price (₹) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">GST Rate *</label>
              <select
                required
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Unit *</label>
              <input
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. KG, PCS, BOX"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">HSN Code</label>
              <input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder="e.g. 1006"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Opening Stock</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Recorded as opening stock with your name in history.
              </p>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">
                Location{' '}
                <span className="text-muted-foreground font-normal">(e.g. Shelf A, Warehouse)</span>
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Shelf A / Main Store"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {createProduct.error && (
              <div className="sm:col-span-2 text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {createProduct.error.message}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={createProduct.isPending} className="h-9">
                {createProduct.isPending ? 'Adding…' : 'Add Product'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {adjustProduct && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Adjust stock</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{adjustProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={closeAdjust}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                Current stock:{' '}
                <span className="font-mono font-medium">
                  {adjustProduct.quantity} {adjustProduct.unit}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Adjustment (+ in / − out) *
                </label>
                <input
                  required
                  type="number"
                  step="0.001"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="e.g. -5 or 10"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {projectedStock != null && !Number.isNaN(parsedAdjustQty) && parsedAdjustQty !== 0 && (
                  <p
                    className={cn(
                      'text-xs',
                      projectedStock < 0 ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    New stock: {projectedStock} {adjustProduct.unit}
                    {projectedStock < 0 && ' — insufficient stock'}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. 5 units damaged in warehouse"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {adjustStock.error && (
                <div className="text-sm text-destructive">{adjustStock.error.message}</div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeAdjust}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    adjustStock.isPending ||
                    !adjustQty ||
                    parsedAdjustQty === 0 ||
                    Number.isNaN(parsedAdjustQty) ||
                    !adjustNotes.trim() ||
                    (projectedStock != null && projectedStock < 0)
                  }
                >
                  {adjustStock.isPending ? 'Saving…' : 'Save adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU, or HSN…"
              className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : products.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Box size={32} className="text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? `No products matching "${search}"` : 'No products yet.'}
                </p>
                {!search && canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="text-sm text-primary font-medium hover:underline mt-2"
                  >
                    Add your first product →
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'hidden md:grid gap-4 px-4 py-2.5 border-b border-border bg-muted/50',
                    canEdit
                      ? 'grid-cols-[1fr_80px_80px_100px_120px_120px_100px]'
                      : 'grid-cols-[1fr_80px_80px_100px_120px_120px]'
                  )}
                >
                  {['Product', 'HSN', 'Unit', 'GST', 'Price', 'Stock', ...(canEdit ? [''] : [])].map(
                    (h) => (
                      <span
                        key={h || 'actions'}
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </span>
                    )
                  )}
                </div>
                <div className="divide-y divide-border">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'px-4 py-3.5 md:grid md:gap-4 md:items-center',
                        canEdit
                          ? 'md:grid-cols-[1fr_80px_80px_100px_120px_120px_100px]'
                          : 'md:grid-cols-[1fr_80px_80px_100px_120px_120px]'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        {p.location && (
                          <p className="text-xs text-muted-foreground mt-0.5">{p.location}</p>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:contents">
                        <p className="text-muted-foreground md:text-xs">
                          <span className="font-medium text-foreground/70 md:hidden">HSN: </span>
                          <span className="font-mono">{p.hsnCode ?? '—'}</span>
                        </p>
                        <p className="text-muted-foreground md:text-xs">
                          <span className="font-medium text-foreground/70 md:hidden">Unit: </span>
                          {p.unit}
                        </p>
                        <p className="text-muted-foreground md:text-xs">
                          <span className="font-medium text-foreground/70 md:hidden">GST: </span>
                          {p.gstRate}%
                        </p>
                        <p className="text-sm font-medium text-foreground font-mono md:text-sm">
                          <span className="text-xs font-medium text-foreground/70 md:hidden">
                            Price:{' '}
                          </span>
                          ₹{p.sellingPrice.toLocaleString('en-IN')}
                        </p>
                        <p
                          className={`text-sm font-medium font-mono md:text-sm ${p.quantity > 0 ? 'text-success' : 'text-danger'}`}
                        >
                          <span className="text-xs font-medium text-foreground/70 md:hidden">
                            Stock:{' '}
                          </span>
                          {p.quantity} {p.unit}
                        </p>
                        {canEdit && (
                          <div className="mt-2 md:mt-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={() => openAdjust(p)}
                            >
                              <SlidersHorizontal size={14} />
                              Adjust
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-foreground">Product</label>
              <select
                value={historyProductId}
                onChange={(e) => setHistoryProductId(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-foreground">Type</label>
              <select
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value as InventoryTxType | '')}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All types</option>
                {(Object.keys(INVENTORY_TX_LABELS) as InventoryTxType[]).map((t) => (
                  <option key={t} value={t}>
                    {INVENTORY_TX_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {historyLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : transactions.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No stock movements recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {['When', 'Product', 'Type', 'Change', 'By', 'Reason'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">{tx.product.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {INVENTORY_TX_LABELS[tx.type]}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-mono font-medium',
                            tx.quantityChange > 0 ? 'text-success' : 'text-destructive'
                          )}
                        >
                          {tx.quantityChange > 0 ? '+' : ''}
                          {tx.quantityChange} {tx.product.unit}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{tx.performedBy.email}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">
                          {tx.notes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
