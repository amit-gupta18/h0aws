'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CreatePurchaseInput } from '@/hooks/usePurchases'

export function PurchaseForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  error,
  pending,
  submitLabel = 'Save bill',
}: {
  form: CreatePurchaseInput
  setForm: (f: CreatePurchaseInput) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  error?: string
  pending: boolean
  submitLabel?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Purchase bill</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier name *" value={form.supplierName} onChange={(v) => setForm({ ...form, supplierName: v })} required />
        <Field label="Supplier GSTIN" value={form.supplierGstin ?? ''} onChange={(v) => setForm({ ...form, supplierGstin: v })} />
        <Field label="Bill number *" value={form.billNumber} onChange={(v) => setForm({ ...form, billNumber: v })} required />
        <div className="space-y-1">
          <label className="text-xs font-medium">Bill date *</label>
          <input
            type="date"
            required
            value={form.billDate}
            onChange={(e) => setForm({ ...form, billDate: e.target.value })}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
          />
        </div>
        <NumField label="Taxable amount *" value={form.taxableAmount} onChange={(v) => setForm({ ...form, taxableAmount: v })} />
        <NumField label="CGST" value={form.cgstTotal ?? 0} onChange={(v) => setForm({ ...form, cgstTotal: v })} />
        <NumField label="SGST" value={form.sgstTotal ?? 0} onChange={(v) => setForm({ ...form, sgstTotal: v })} />
        <NumField label="IGST" value={form.igstTotal ?? 0} onChange={(v) => setForm({ ...form, igstTotal: v })} />
        <NumField label="Grand total *" value={form.grandTotal} onChange={(v) => setForm({ ...form, grandTotal: v })} />
        {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
      />
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono"
      />
    </div>
  )
}
