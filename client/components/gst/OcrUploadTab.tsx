'use client'

import { useCallback, useState } from 'react'
import { Camera, Loader2, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useCreatePurchase,
  usePurchases,
  type CreatePurchaseInput,
} from '@/hooks/usePurchases'
import { usePurchaseOcr, type OcrResult } from '@/hooks/useGstIntelligence'
import { periodRange } from '@/hooks/usePurchases'
import { fmt, TH, TD, TR } from './gst-utils'
import { TableShell } from './TableShell'
import { PurchaseForm } from './PurchaseForm'

function emptyPurchaseForm(billDate: string): CreatePurchaseInput {
  return {
    supplierName: '',
    supplierGstin: '',
    supplierStateCode: '',
    billNumber: '',
    billDate,
    transactionType: 'INTRA_STATE',
    taxableAmount: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    grandTotal: 0,
    notes: '',
  }
}

export function OcrUploadTab({ month, year }: { month: number; year: number }) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<OcrResult | null>(null)
  const [editForm, setEditForm] = useState<CreatePurchaseInput | null>(null)
  const [showManual, setShowManual] = useState(false)

  const billDateDefault = `${year}-${String(month).padStart(2, '0')}-01`
  const [manualForm, setManualForm] = useState(() => emptyPurchaseForm(billDateDefault))

  const ocr = usePurchaseOcr()
  const createPurchase = useCreatePurchase()
  const { from, to } = periodRange(month, year)
  const { data: recentPurchases } = usePurchases({ from, to, limit: 10 })

  const processFile = useCallback(
    async (file: File) => {
      const result = await ocr.mutateAsync({ file })
      setPreview(result)
      setEditForm(result.purchaseInput)
    },
    [ocr]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
    e.target.value = ''
  }

  async function handleConfirmSave() {
    if (!editForm) return
    await createPurchase.mutateAsync({
      ...editForm,
      supplierGstin: editForm.supplierGstin || undefined,
      supplierStateCode: editForm.supplierStateCode || undefined,
      notes: editForm.notes || undefined,
    })
    setPreview(null)
    setEditForm(null)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card',
          ocr.isPending && 'pointer-events-none opacity-70'
        )}
      >
        {ocr.isPending ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Reading your invoice…</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop supplier bill photo here</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG or WebP · max 5MB</p>
            <label className="mt-4 inline-flex cursor-pointer">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFileInput} />
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                <Camera size={16} /> Upload invoice
              </span>
            </label>
          </>
        )}
      </div>

      {ocr.error && (
        <p className="text-sm text-destructive">{ocr.error.message}</p>
      )}

      {preview && editForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Extracted fields</h3>
            <span
              className={cn(
                'text-xs rounded px-2 py-0.5 capitalize',
                preview.confidence === 'high'
                  ? 'bg-success/10 text-success'
                  : preview.confidence === 'medium'
                    ? 'bg-amber-500/10 text-amber-800'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {preview.confidence} confidence
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              ['Supplier', preview.extracted.supplierName],
              ['GSTIN', preview.extracted.supplierGSTIN],
              ['Bill #', preview.extracted.invoiceNumber],
              ['Date', preview.extracted.invoiceDate],
              ['HSN', preview.extracted.hsnCode],
              ['Total', preview.extracted.totalAmount != null ? fmt(preview.extracted.totalAmount) : null],
            ].map(([label, val]) => (
              <div key={label as string}>
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className="font-medium">{val ?? '—'}</p>
              </div>
            ))}
          </div>
          <PurchaseForm
            form={editForm}
            setForm={setEditForm}
            onSubmit={(e) => {
              e.preventDefault()
              void handleConfirmSave()
            }}
            onCancel={() => {
              setPreview(null)
              setEditForm(null)
            }}
            error={createPurchase.error?.message}
            pending={createPurchase.isPending}
            submitLabel="Confirm & save"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Or enter manually</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowManual(!showManual)}>
          <Plus size={15} /> {showManual ? 'Hide form' : 'Add purchase bill'}
        </Button>
      </div>

      {showManual && (
        <PurchaseForm
          form={manualForm}
          setForm={setManualForm}
          onSubmit={async (e) => {
            e.preventDefault()
            await createPurchase.mutateAsync({
              ...manualForm,
              supplierGstin: manualForm.supplierGstin || undefined,
              supplierStateCode: manualForm.supplierStateCode || undefined,
              notes: manualForm.notes || undefined,
            })
            setShowManual(false)
            setManualForm(emptyPurchaseForm(billDateDefault))
          }}
          onCancel={() => setShowManual(false)}
          error={createPurchase.error?.message}
          pending={createPurchase.isPending}
        />
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2">Recent purchase bills ({MONTH_LABEL(month, year)})</h3>
        <TableShell
          empty={!recentPurchases?.data.length}
          emptyMsg="No purchase bills this month. Upload a supplier invoice to track input GST."
        >
          <thead>
            <tr>
              {['Bill', 'Date', 'Supplier', 'Total'].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentPurchases?.data.map((r) => (
              <tr key={r.id} className={TR}>
                <td className={`${TD} font-medium`}>{r.billNumber}</td>
                <td className={TD}>{r.billDate}</td>
                <td className={TD}>{r.supplierName}</td>
                <td className={`${TD} font-mono`}>{fmt(r.grandTotal)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  )
}

function MONTH_LABEL(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
