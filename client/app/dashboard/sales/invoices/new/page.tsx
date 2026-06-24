'use client'

import { useState, useRef, useDeferredValue, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { useBusiness } from '@/hooks/useBusinesses'
import { useCustomerSearch, useCreateCustomer, type Customer } from '@/hooks/useCustomers'
import { useProductSearch, type Product } from '@/hooks/useProducts'
import { calculateGST } from '@/lib/gst-engine'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { StateSelect } from '@/components/StateSelect'
import { Plus, Trash2, Save } from 'lucide-react'

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

export default function NewInvoicePage() {
  const router = useRouter()
  const clientBillIdRef = useRef(crypto.randomUUID())
  const createInvoice = useCreateInvoice()

  const [customerId, setCustomerId] = useState<string | undefined>()
  const [customerName, setCustomerName] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const deferredCustomerQuery = useDeferredValue(customerQuery)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', gstin: '', stateCode: '' })

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH')
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), name: '', hsn: '', unit: 'PCS', quantity: 1, unitPrice: 0, discount: 0, gstRate: 18 },
  ])

  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const deferredProductQuery = useDeferredValue(productQuery)

  const memberships = useAuthStore((s) => s.memberships)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const activeMembership = memberships.find((m) => m.businessId === activeBusinessId)
  const { data: business } = useBusiness(activeBusinessId)

  const sellerGSTIN = business?.gstin ?? activeMembership?.gstin ?? null
  const sellerStateCode = business?.stateCode ?? activeMembership?.stateCode ?? '00'

  const { data: customersData } = useCustomerSearch(deferredCustomerQuery, !!deferredCustomerQuery)
  const { data: productsData } = useProductSearch(deferredProductQuery, !!deferredProductQuery && activeItemIndex !== null)
  const createCustomer = useCreateCustomer()

  const selectedCustomer = customersData?.data.find((c) => c.id === customerId)

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
    })
    setProductQuery('')
    setActiveItemIndex(null)
  }, [updateItem])

  const selectCustomer = useCallback((customer: Customer) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerQuery('')
    setShowCustomerDropdown(false)
  }, [])

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) return
    const created = await createCustomer.mutateAsync(newCustomer)
    selectCustomer(created)
    setShowNewCustomerForm(false)
    setNewCustomer({ name: '', phone: '', gstin: '', stateCode: '' })
  }

  const handleSubmit = async () => {
    const validItems = items.filter((item) => item.name && item.quantity > 0)
    if (validItems.length === 0) return

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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer</label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Search customer or leave empty for walk-in"
                value={customerId ? customerName : customerQuery}
                onChange={(e) => {
                  if (customerId) {
                    setCustomerId(undefined)
                    setCustomerName('')
                  }
                  setCustomerQuery(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              {showCustomerDropdown && customerQuery && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-lg">
                  {customersData?.data.map((customer) => (
                    <button
                      key={customer.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      {customer.phone && <div className="text-muted-foreground text-xs">{customer.phone}</div>}
                    </button>
                  ))}
                  <button
                    className="w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                    onClick={() => {
                      setShowNewCustomerForm(true)
                      setShowCustomerDropdown(false)
                      setNewCustomer((prev) => ({ ...prev, name: customerQuery }))
                    }}
                  >
                    + Add new customer &quot;{customerQuery}&quot;
                  </button>
                </div>
              )}
            </div>
            {customerId && (
              <button
                className="mt-1 text-xs text-muted-foreground hover:underline"
                onClick={() => {
                  setCustomerId(undefined)
                  setCustomerName('')
                }}
              >
                Clear customer (use walk-in)
              </button>
            )}
          </div>

          {showNewCustomerForm && (
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
                <Button size="sm" onClick={handleCreateCustomer} disabled={!newCustomer.name}>
                  Save Customer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewCustomerForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
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
                    <div className="relative">
                      <input
                        className="w-full min-w-[150px] rounded border bg-background px-2 py-1 text-sm"
                        placeholder="Search or type name"
                        value={activeItemIndex === index ? productQuery : item.name}
                        onChange={(e) => {
                          setActiveItemIndex(index)
                          setProductQuery(e.target.value)
                          updateItem(item.id, { name: e.target.value, productId: undefined })
                        }}
                        onFocus={() => setActiveItemIndex(index)}
                      />
                      {activeItemIndex === index && productQuery && productsData?.data.length ? (
                        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow-lg">
                          {productsData.data.map((product) => (
                            <button
                              key={product.id}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => selectProduct(product, item.id)}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-muted-foreground text-xs">
                                {product.hsnCode ? `HSN: ${product.hsnCode} | ` : ''}
                                {product.sellingPrice.toFixed(2)} | GST: {product.gstRate}%
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
                      className="w-16 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-20 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-16 rounded border bg-background px-2 py-1 text-right text-sm"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="w-16 rounded border bg-background px-1 py-1 text-sm"
                      value={item.gstRate}
                      onChange={(e) => updateItem(item.id, { gstRate: parseInt(e.target.value) as 0 | 5 | 12 | 18 | 28 })}
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createInvoice.isPending || items.every((i) => !i.name)}
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
