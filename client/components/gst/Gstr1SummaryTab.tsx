'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { GstSummary } from '@/hooks/useGst'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { fmt, TH, TD, TR } from './gst-utils'
import { TableShell } from './TableShell'

export function Gstr1SummaryTab({ data }: { data: GstSummary }) {
  const [section, setSection] = useState<'liability' | 'b2b' | 'b2c' | 'hsn'>('liability')
  const [hsnSlice, setHsnSlice] = useState<'b2b' | 'b2c'>('b2b')

  const complianceChecks = [
    { label: 'GSTR-1 Table 4 (B2B)', ok: data.b2b.length >= 0 },
    { label: 'GSTR-1 Table 7 (B2C summary)', ok: true },
    { label: 'GSTR-1 Table 12 HSN (B2B/B2C split)', ok: data.hsn.b2b.length + data.hsn.b2c.length >= 0 },
    { label: 'GSTR-1 Table 13 (documents)', ok: data.documents.issuedInvoices >= 0 },
    { label: 'Inward register (GSTR-2 prep)', ok: data.inward.b2b.length + data.inward.unregistered.length >= 0 },
    { label: 'GSTR-2B reconciliation', ok: false },
    { label: 'Portal e-invoice IRN', ok: false },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 overflow-x-auto">
        {(
          [
            ['liability', 'Liability'],
            ['b2b', 'B2B'],
            ['b2c', 'B2C'],
            ['hsn', 'HSN'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              section === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'liability' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Output GST</p>
              <p className="text-2xl font-bold font-mono">{fmt(data.liability.outputGST)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Input GST</p>
              <p className="text-2xl font-bold font-mono">{fmt(data.liability.inputGST)}</p>
              <p className="text-xs text-muted-foreground mt-1">From purchase bills in Rakhat</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Net payable (est.)</p>
              <p
                className={cn(
                  'text-2xl font-bold font-mono',
                  data.liability.netPayable > 0 ? 'text-destructive' : 'text-success'
                )}
              >
                {fmt(data.liability.netPayable)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Due by {data.liability.filingDeadline}</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            {data.liability.disclaimer}
          </div>
        </div>
      )}

      {section === 'b2b' && (
        <TableShell empty={data.b2b.length === 0} emptyMsg="No B2B tax invoices this month.">
          <thead>
            <tr>
              {['Invoice', 'Date', 'Customer', 'GSTIN', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.b2b.map((r) => (
              <tr key={r.invoiceNumber} className={TR}>
                <td className={`${TD} font-medium`}>{r.invoiceNumber}</td>
                <td className={TD}>{r.invoiceDate}</td>
                <td className={TD}>{r.customerName}</td>
                <td className={`${TD} font-mono text-xs`}>{r.customerGSTIN}</td>
                <td className={`${TD} font-mono`}>{fmt(r.taxableAmount)}</td>
                <td className={`${TD} font-mono`}>{fmt(r.cgst)}</td>
                <td className={`${TD} font-mono`}>{fmt(r.sgst)}</td>
                <td className={`${TD} font-mono`}>{fmt(r.igst)}</td>
                <td className={`${TD} font-mono font-medium`}>{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {section === 'b2c' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['Taxable', data.b2c.taxableAmount],
              ['CGST', data.b2c.cgst],
              ['SGST', data.b2c.sgst],
              ['IGST', data.b2c.igst],
              ['Total', data.b2c.total],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className="font-mono font-semibold">{fmt(val as number)}</p>
              </div>
            ))}
          </div>
          {data.b2cLarge.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              {data.b2cLarge.length} B2C invoice(s) over ₹2.5L — may need Table 5 reporting on portal.
            </div>
          )}
          <TableShell empty={data.b2c.byRate.length === 0} emptyMsg="No B2C tax invoices this month.">
            <thead>
              <tr>
                {['GST Rate', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'].map((h) => (
                  <th key={h} className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.b2c.byRate.map((r) => (
                <tr key={r.gstRate} className={TR}>
                  <td className={TD}>{r.gstRate}%</td>
                  <td className={TD}>{r.invoiceCount}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.taxableAmount)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.cgst)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.sgst)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.igst)}</td>
                  <td className={`${TD} font-mono font-medium`}>{fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}

      {section === 'hsn' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['b2b', 'b2c'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setHsnSlice(s)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium border',
                  hsnSlice === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                HSN {s.toUpperCase()}
              </button>
            ))}
          </div>
          <TableShell
            empty={(hsnSlice === 'b2b' ? data.hsn.b2b : data.hsn.b2c).length === 0}
            emptyMsg={`No HSN data for B2C ${hsnSlice.toUpperCase()} this month.`}
          >
            <thead>
              <tr>
                {['HSN', 'Unit', 'Qty', 'Taxable', 'CGST', 'SGST', 'IGST'].map((h) => (
                  <th key={h} className={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(hsnSlice === 'b2b' ? data.hsn.b2b : data.hsn.b2c).map((r) => (
                <tr key={`${r.hsnCode}-${r.unit}`} className={TR}>
                  <td className={`${TD} font-mono`}>{r.hsnCode}</td>
                  <td className={TD}>{r.unit}</td>
                  <td className={`${TD} font-mono`}>{r.totalQuantity}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.taxableValue)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.cgst)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.sgst)}</td>
                  <td className={`${TD} font-mono`}>{fmt(r.igst)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Compliance checklist</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {complianceChecks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              {c.ok ? (
                <CheckCircle2 size={16} className="text-success shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-muted-foreground shrink-0" />
              )}
              <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">{data.documents.note}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Issued: {data.documents.issuedInvoices} · Cancelled: {data.documents.cancelledInvoices}
        </p>
      </div>
    </div>
  )
}
