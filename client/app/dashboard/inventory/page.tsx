'use client'

import { useState } from 'react'
import { useProductSearch, useCreateProduct } from '@/hooks/useProducts'
import { Button } from '@/components/ui/button'
import { Box, Plus, X } from 'lucide-react'

const GST_RATES = [0, 5, 12, 18, 28] as const

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useProductSearch(search)
  const products = data?.data ?? []

  const createProduct = useCreateProduct()

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
    setForm({ name: '', sellingPrice: '', gstRate: '18', unit: '', hsnCode: '', category: '', quantity: '', location: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-9 w-full shrink-0 gap-2 whitespace-nowrap sm:w-auto">
          <Plus size={15} /> Add Product
        </Button>
      </div>

      {/* Add product form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">New Product</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
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
                  <option key={r} value={r}>{r}%</option>
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
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Location <span className="text-muted-foreground font-normal">(e.g. Shelf A, Warehouse)</span></label>
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

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU, or HSN…"
          className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Product list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : products.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Box size={32} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `No products matching "${search}"` : 'No products yet.'}
            </p>
            {!search && (
              <button onClick={() => setShowForm(true)} className="text-sm text-primary font-medium hover:underline mt-2">
                Add your first product →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_80px_80px_100px_120px_120px] gap-4 px-4 py-2.5 border-b border-border bg-muted/50">
              {['Product', 'HSN', 'Unit', 'GST', 'Price', 'Stock'].map((h) => (
                <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              {products.map((p) => (
                <div key={p.id} className="px-4 py-3.5 md:grid md:grid-cols-[1fr_80px_80px_100px_120px_120px] md:gap-4 md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    {p.location && <p className="text-xs text-muted-foreground mt-0.5">{p.location}</p>}
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
                      <span className="text-xs font-medium text-foreground/70 md:hidden">Price: </span>
                      ₹{p.sellingPrice.toLocaleString('en-IN')}
                    </p>
                    <p className={`text-sm font-medium font-mono md:text-sm ${p.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                      <span className="text-xs font-medium text-foreground/70 md:hidden">Stock: </span>
                      {p.quantity} {p.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
