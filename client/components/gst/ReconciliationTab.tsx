'use client'

import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReconciliationDemo } from '@/hooks/useGstIntelligence'
import { fmt, TH, TD, TR } from './gst-utils'
import { TableShell } from './TableShell'

function riskStyle(risk: string) {
  if (risk === 'critical') return 'bg-destructive/10 text-destructive'
  if (risk === 'high') return 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
  return 'bg-success/10 text-success'
}

export function ReconciliationTab({
  data,
  isLoading,
  error,
}: {
  data?: ReconciliationDemo
  isLoading: boolean
  error: Error | null
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading reconciliation…</p>
  }
  if (error) {
    return <p className="text-sm text-destructive py-4">{error.message}</p>
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          GSP auto-sync coming Q3 2026
        </span>
        <span className="text-xs text-muted-foreground">{data.disclaimer}</span>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
        <p className="text-sm text-foreground">{data.aiSummary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Matched</p>
          <p className="text-xl font-bold text-success">{data.matched}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Mismatched</p>
          <p className="text-xl font-bold text-destructive">{data.mismatched}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">ITC at risk</p>
          <p className="text-xl font-bold font-mono">{fmt(data.totalITCAtRisk)}</p>
        </div>
      </div>

      <TableShell empty={data.mismatches.length === 0} emptyMsg="No reconciliation data.">
        <thead>
          <tr>
            {['Supplier', 'Your ITC', 'Supplier filed', 'Difference', 'Risk', 'Action'].map((h) => (
              <th key={h} className={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.mismatches.map((m) => (
            <tr key={m.supplierGSTIN} className={TR}>
              <td className={TD}>
                <p className="font-medium">{m.supplierName}</p>
                <p className="text-xs font-mono text-muted-foreground">{m.supplierGSTIN}</p>
              </td>
              <td className={`${TD} font-mono`}>{fmt(m.yourClaimedITC)}</td>
              <td className={`${TD} font-mono`}>{fmt(m.supplierFiledAmount)}</td>
              <td className={`${TD} font-mono font-medium`}>{fmt(m.difference)}</td>
              <td className={TD}>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium capitalize',
                    riskStyle(m.risk)
                  )}
                >
                  {m.risk !== 'none' && <AlertTriangle size={12} />}
                  {m.risk}
                </span>
              </td>
              <td className={`${TD} text-xs text-muted-foreground max-w-[200px]`}>
                {m.action ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  )
}
