'use client'

import { useState } from 'react'
import { useCustomerSearch, useCreateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Users, Plus, X, Phone, MapPin, Hash } from 'lucide-react'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useCustomerSearch(search)
  const customers = data?.data ?? []

  const createCustomer = useCreateCustomer()

  const [form, setForm] = useState({ name: '', phone: '', gstin: '', billingAddress: '' })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await createCustomer.mutateAsync({
      name: form.name,
      phone: form.phone || undefined,
      gstin: form.gstin || undefined,
      billingAddress: form.billingAddress || undefined,
    })
    setForm({ name: '', phone: '', gstin: '', billingAddress: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-9 w-full shrink-0 gap-2 whitespace-nowrap sm:w-auto">
          <Plus size={15} /> Add Customer
        </Button>
      </div>

      {/* Add customer form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">New Customer</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Business or person name"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">GSTIN</label>
              <input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="15-char GSTIN"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-foreground">Billing Address</label>
              <input
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                placeholder="Full billing address"
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {createCustomer.error && (
              <div className="sm:col-span-2 text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {createCustomer.error.message}
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomer.isPending} className="h-9">
                {createCustomer.isPending ? 'Adding…' : 'Add Customer'}
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
          placeholder="Search by name, phone, or GSTIN…"
          className="w-full rounded-md border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Customer list */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Users size={32} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? `No customers matching "${search}"` : 'No customers yet.'}
            </p>
            {!search && (
              <button onClick={() => setShowForm(true)} className="text-sm text-primary font-medium hover:underline mt-2">
                Add your first customer →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {customers.map((c) => (
              <div key={c.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone size={11} /> {c.phone}
                      </span>
                    )}
                    {c.billingAddress && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin size={11} /> {c.billingAddress}
                      </span>
                    )}
                  </div>
                </div>
                {c.gstin && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono shrink-0">
                    <Hash size={11} /> {c.gstin}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
