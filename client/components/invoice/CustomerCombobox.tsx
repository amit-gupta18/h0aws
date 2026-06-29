'use client'

import { useState, useDeferredValue, useRef, useEffect, useCallback } from 'react'
import { useInfiniteCustomers, useCreateCustomer, type Customer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { StateSelect } from '@/components/StateSelect'
import { Loader2 } from 'lucide-react'

type CustomerComboboxProps = {
  customerId?: string
  customerName: string
  onSelect: (customer: Customer | null) => void
}

export function CustomerCombobox({ customerId, customerName, onSelect }: CustomerComboboxProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [open, setOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', gstin: '', stateCode: '' })
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteCustomers(
    deferredQuery,
    open && !customerId
  )
  const createCustomer = useCreateCustomer()

  const customers = data?.pages.flatMap((p) => p.data) ?? []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const selectCustomer = (customer: Customer) => {
    onSelect(customer)
    setQuery('')
    setOpen(false)
    setShowNewForm(false)
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) return
    const created = await createCustomer.mutateAsync(newCustomer)
    selectCustomer(created)
    setNewCustomer({ name: '', phone: '', gstin: '', stateCode: '' })
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <input
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Search customer or leave empty for walk-in"
          value={customerId ? customerName : query}
          onChange={(e) => {
            if (customerId) onSelect(null)
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {open && !customerId && (
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No customers found</div>
            ) : (
              customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => selectCustomer(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  {customer.phone && (
                    <div className="text-muted-foreground text-xs">{customer.phone}</div>
                  )}
                </button>
              ))
            )}
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              className="w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-muted"
              onClick={() => {
                setShowNewForm(true)
                setOpen(false)
                setNewCustomer((prev) => ({ ...prev, name: query || prev.name }))
              }}
            >
              + Add new customer{query ? ` "${query}"` : ''}
            </button>
          </div>
        )}
      </div>

      {customerId && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={() => onSelect(null)}
        >
          Clear customer (use walk-in)
        </button>
      )}

      {showNewForm && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-sm font-medium">New Customer</div>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Name *"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="GSTIN"
            value={newCustomer.gstin}
            onChange={(e) => setNewCustomer((p) => ({ ...p, gstin: e.target.value }))}
          />
          <StateSelect
            value={newCustomer.stateCode}
            onValueChange={(stateCode) => setNewCustomer((p) => ({ ...p, stateCode }))}
            placeholder="Select state"
            triggerClassName="border-border bg-background dark:bg-background"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateCustomer} disabled={!newCustomer.name || createCustomer.isPending}>
              {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
