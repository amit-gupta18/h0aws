'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useBusiness } from '@/hooks/useBusinesses'
import { type Customer } from '@/hooks/useCustomers'
import { type Product } from '@/hooks/useProducts'
import { calculateGST } from '@/lib/gst-engine'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { CustomerCombobox } from '@/components/invoice/CustomerCombobox'
import { ProductPicker } from '@/components/invoice/ProductPicker'
import { Plus, Trash2, Save, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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
  availableStock?: number
}

const GST_RATES = [0, 5, 12, 18, 28] as const

export default function NewInvoicePage() {
  const router = useRouter()
  const clientBillIdRef = useRef(crypto.randomUUID())
  const createInvoice = useCreateInvoice()

  const [customerId, setCustomerId] = useState<string | undefined>()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), name: '', hsn: '', unit: 'PCS', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18 },
  ])

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)

  const memberships = useAuthStore((s) => s.memberships)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const activeMembership = memberships.find((m) => m.businessId === activeBusinessId)
  const { data: business } = useBusiness(activeBusinessId)

  const inventoryTracking = business?.inventoryTracking ?? false
  const sellerGSTIN = business?.gstin ?? activeMembership?.gstin ?? null
  const sellerStateCode = business?.stateCode ?? activeMembership?.stateCode ?? '00'

  const gstResult = useMemo(() => {
    return calculateGST({
      sellerGSTIN,
      sellerStateCode,
      buyerStateCode: selectedCustomer?.stateCode ?? null,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        gstRate: item.gstRate,
      })),
    })
  }, [items, sellerGSTIN, sellerStateCode, selectedCustomer])

  const stockMismatches = useMemo(() => {
    if (!inventoryTracking) return []
    return items.filter(
      (item) =>
        item.productId &&
        item.availableStock !== undefined &&
        item.quantity > item.availableStock
    )
  }, [items, inventoryTracking])

  const hasStockMismatch = stockMismatches.length > 0

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', hsn: '', unit: 'PCS', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18 },
    ])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }, [])

  const updateItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const selectProduct = useCallback((product: Product, itemId: string) => {
    updateItem(itemId, {
      productId: product.id,
      name: product.name,
      hsn: product.hsnCode ?? '',
      unit: product.unit,
      unitPrice: product.sellingPrice,
      gstRate: product.gstRate as 0 | 5 | 12 | 18 | 28,
      availableStock: product.quantity,
    })
    setActiveItemIndex(null)
  }, [updateItem])

  const handleCustomerSelect = useCallback((customer: Customer | null) => {
    if (customer) {
      setCustomerId(customer.id)
      setSelectedCustomer(customer)
    } else {
      setCustomerId(undefined)
      setSelectedCustomer(null)
    }
  }, [])

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.name && item.quantity > 0)
    if (validItems.length === 0 || hasStockMismatch) return

    const result = await createInvoice.mutateAsync({
      clientBillId: clientBillIdRef.current,
      customerId,
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

    router.push(`/dashboard/sales/invoices/${result.id}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Invoice</h1>
        <p className="text-muted-foreground text-sm">Create a new sales invoice</p>
      </div>

      {!inventoryTracking && (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          Billing-only mode — stock is not deducted on sales.{' '}
          <Link href="/dashboard/settings" className="text-primary hover:underline">
            Enable inventory tracking in Settings
          </Link>{' '}
          when you are ready.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer</label>
            <CustomerCombobox
              customerId={customerId}
              customerName={selectedCustomer?.name ?? ''}
              onSelect={handleCustomerSelect}
            />
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
              {items.map((item, index) => {
                const stockMismatch =
                  inventoryTracking &&
                  item.productId &&
                  item.availableStock !== undefined &&
                  item.quantity > item.availableStock

                return (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <ProductPicker
                        value={item.name}
                        active={activeItemIndex === index}
                        inventoryTracking={inventoryTracking}
                        onFocus={() => setActiveItemIndex(index)}
                        onChange={(name) =>
                          updateItem(item.id, {
                            name,
                            productId: undefined,
                            availableStock: undefined,
                          })
                        }
                        onSelect={(product) => selectProduct(product, item.id)}
                      />
                      {stockMismatch && (
                        <div className="mt-1 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-500">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          Only {item.availableStock} in stock — reduce quantity to continue
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border bg-background px-2 py-1 text-sm"
                        placeholder="HSN"
                        value={item.hsn}
                        onChange={(e) => updateItem(item.id, { hsn: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-16 rounded border bg-background px-2 py-1 text-sm"
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={`w-16 rounded border bg-background px-2 py-1 text-right text-sm ${stockMismatch ? 'border-amber-500' : ''}`}
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
                )
              })}
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
            placeholder="Add any notes for this invoice"
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
            {gstResult.summary.discountTotal > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span className="font-mono">-{gstResult.summary.discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Taxable Amount</span>
              <span className="font-mono">{gstResult.summary.taxableAmount.toFixed(2)}</span>
            </div>
            {gstResult.transactionType === 'INTER_STATE' ? (
              <div className="flex justify-between">
                <span>IGST</span>
                <span className="font-mono">{gstResult.summary.igstTotal.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span className="font-mono">{gstResult.summary.cgstTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span className="font-mono">{gstResult.summary.sgstTotal.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span className="font-mono">
                {gstResult.summary.grandTotal.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                })}
              </span>
            </div>
            <div className="text-muted-foreground text-xs">
              {gstResult.documentType.replace('_', ' ')} | {gstResult.transactionType.replace('_', '-')}
            </div>
          </div>
        </div>
      </div>

      {hasStockMismatch && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Resolve stock quantity mismatches before creating this invoice.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            createInvoice.isPending ||
            items.every((i) => !i.name) ||
            hasStockMismatch
          }
          className="w-full sm:w-auto"
        >
          <Save className="mr-2 h-4 w-4" />
          {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>

      {createInvoice.isError && (
        <div className="text-destructive text-sm">{createInvoice.error.message}</div>
      )}
    </div>
  )
}
