'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useInvoice, useUpdateInvoice } from '@/hooks/useInvoices'
import { useBusiness } from '@/hooks/useBusinesses'
import { type Product } from '@/hooks/useProducts'
import { calculateGST } from '@/lib/gst-engine'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { ProductPicker } from '@/components/invoice/ProductPicker'
import { Plus, Trash2, Save, AlertTriangle, Lock } from 'lucide-react'

type LineItem = {
  id: string
  productId?: string
  name: string
  hsn: string
  unit: string
  quantity: number
  unitPrice: number
  discount: number
  gstRate: 0 | 5 | 12 | 18 | 28
}

const GST_RATES = [0, 5, 12, 18, 28] as const

function toGstRate(rate: number): 0 | 5 | 12 | 18 | 28 {
  if (rate === 0 || rate === 5 || rate === 12 || rate === 18 || rate === 28) return rate
  return 18
}

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: invoice, isLoading, error } = useInvoice(id)
  const updateInvoice = useUpdateInvoice(id)

  const [initialized, setInitialized] = useState(false)
  const [invoiceDate, setInvoiceDate] = useState('')
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)

  const originalQtyByProduct = useRef<Map<string, number>>(new Map())
  const stockOnHandByProduct = useRef<Map<string, number>>(new Map())

  const memberships = useAuthStore((s) => s.memberships)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const activeMembership = memberships.find((m) => m.businessId === activeBusinessId)
  const { data: business } = useBusiness(activeBusinessId)

  const inventoryTracking = business?.inventoryTracking ?? false
  const sellerGSTIN = business?.gstin ?? activeMembership?.gstin ?? null
  const sellerStateCode = business?.stateCode ?? activeMembership?.stateCode ?? '00'
  const buyerStateCode = invoice?.customer?.stateCode ?? null

  useEffect(() => {
    if (!invoice || initialized) return

    setInvoiceDate(invoice.invoiceDate)
    setPaymentMode(invoice.paymentMode as typeof paymentMode)
    setNotes(invoice.notes ?? '')
    setItems(
      invoice.items.map((item) => ({
        id: crypto.randomUUID(),
        productId: item.productId ?? undefined,
        name: item.nameSnapshot,
        hsn: item.hsnSnapshot ?? '',
        unit: item.unitSnapshot ?? 'PCS',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstRate: toGstRate(item.gstRate),
      }))
    )

    const orig = new Map<string, number>()
    const stock = new Map<string, number>()
    for (const item of invoice.items) {
      if (item.productId) {
        orig.set(item.productId, (orig.get(item.productId) ?? 0) + item.quantity)
        if (item.stockOnHand != null) {
          stock.set(item.productId, item.stockOnHand)
        }
      }
    }
    originalQtyByProduct.current = orig
    stockOnHandByProduct.current = stock
    setInitialized(true)
  }, [invoice, initialized])

  const gstResult = useMemo(() => {
    return calculateGST({
      sellerGSTIN,
      sellerStateCode,
      buyerStateCode,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstRate: item.gstRate,
      })),
    })
  }, [items, sellerGSTIN, sellerStateCode, buyerStateCode])

  const hasStockMismatch = useMemo(() => {
    if (!inventoryTracking) return false

    const newTotals = new Map<string, number>()
    for (const item of items) {
      if (!item.productId) continue
      newTotals.set(item.productId, (newTotals.get(item.productId) ?? 0) + item.quantity)
    }

    for (const [productId, newTotal] of newTotals) {
      const oldTotal = originalQtyByProduct.current.get(productId) ?? 0
      const stock = stockOnHandByProduct.current.get(productId) ?? 0
      if (newTotal > stock + oldTotal) return true
    }
    return false
  }, [items, inventoryTracking])

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', hsn: '', unit: 'PCS', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18 },
    ])
  }, [])

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== lineId) : prev))
  }, [])

  const updateItem = useCallback((lineId: string, updates: Partial<LineItem>) => {
    setItems((prev) => prev.map((item) => (item.id === lineId ? { ...item, ...updates } : item)))
  }, [])

  const selectProduct = useCallback((product: Product, itemId: string) => {
    stockOnHandByProduct.current.set(product.id, product.quantity)
    updateItem(itemId, {
      productId: product.id,
      name: product.name,
      hsn: product.hsnCode ?? '',
      unit: product.unit,
      unitPrice: product.sellingPrice,
      gstRate: product.gstRate as 0 | 5 | 12 | 18 | 28,
    })
    setActiveItemIndex(null)
  }, [updateItem])

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.name && item.quantity > 0)
    if (validItems.length === 0 || hasStockMismatch) return

    await updateInvoice.mutateAsync({
      invoiceDate,
      paymentMode,
      notes: notes || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        hsn: item.hsn || undefined,
        unit: item.unit || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstRate: item.gstRate,
      })),
    })

    router.push(`/dashboard/sales/invoices/${id}`)
  }

  if (isLoading || !initialized) {
    return <div className="text-muted-foreground">Loading invoice...</div>
  }

  if (error) {
    return <div className="text-destructive">{error.message}</div>
  }

  if (!invoice) {
    return <div className="text-muted-foreground">Invoice not found</div>
  }

  if (invoice.status === 'CANCELLED') {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Cancelled invoices cannot be edited.</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const customerLabel = invoice.customer?.name ?? 'Walk-in Customer'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Invoice</h1>
        <p className="text-muted-foreground text-sm">
          {invoice.invoiceNumber} — update line items, date, and payment details
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer</label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{customerLabel}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Customer cannot be changed on an existing invoice.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Invoice Date</label>
            <input
              type="date"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Payment Mode</label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Items</label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Item Name</th>
                <th className="px-3 py-2 text-left font-medium">HSN</th>
                <th className="px-3 py-2 text-left font-medium">Unit</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Discount</th>
                <th className="px-3 py-2 text-right font-medium">GST %</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <ProductPicker
                      value={item.name}
                      active={activeItemIndex === index}
                      inventoryTracking={inventoryTracking}
                      onFocus={() => setActiveItemIndex(index)}
                      onChange={(name) =>
                        updateItem(item.id, { name, productId: undefined })
                      }
                      onSelect={(product) => selectProduct(product, item.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-20 rounded border bg-background px-2 py-1 text-sm"
                      value={item.hsn}
                      onChange={(e) => updateItem(item.id, { hsn: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-16 rounded border bg-background px-2 py-1 text-sm"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-16 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-20 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-16 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) =>
                        updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-16 rounded border bg-background px-1 py-1 text-sm"
                      value={item.gstRate}
                      onChange={(e) =>
                        updateItem(item.id, {
                          gstRate: parseInt(e.target.value) as 0 | 5 | 12 | 18 | 28,
                        })
                      }
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {gstResult.lines[index]?.lineTotal.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{gstResult.summary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span className="font-mono">
                {gstResult.summary.grandTotal.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {hasStockMismatch && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Insufficient stock for one or more catalog items — adjust quantities to continue.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            updateInvoice.isPending ||
            items.every((i) => !i.name) ||
            hasStockMismatch
          }
          className="w-full sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {updateInvoice.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {updateInvoice.isError && (
        <div className="text-destructive text-sm">{updateInvoice.error.message}</div>
      )}
    </div>
  )
}
