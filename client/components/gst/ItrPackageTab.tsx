'use client'

import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadItrPackage, currentFyStartYear } from '@/hooks/useGstIntelligence'

const INCLUDES = [
  'Business summary (name, GSTIN, financial year)',
  'Revenue summary — month-wise from issued invoices',
  'Expense summary — category-wise from expense records',
  'GST paid (CGST, SGST, IGST totals)',
  'Input tax credit claimed from purchase bills',
  'Net profit estimate (revenue − expenses)',
  'Cover note for your CA',
]

export function ItrPackageTab() {
  const fy = currentFyStartYear()
  const fyLabel = `FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      await downloadItrPackage(fy)
      setLastGenerated(new Date().toLocaleString('en-IN'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <FileText className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-semibold">ITR-ready document package</h3>
            <p className="text-sm text-muted-foreground mt-1">
              One PDF with everything your CA needs for {fyLabel}. Real data from your Rakhat records.
            </p>
          </div>
        </div>
        <ul className="space-y-2 mb-5">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-success mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <Button className="gap-2" onClick={() => void handleDownload()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Preparing your document…
            </>
          ) : (
            <>
              <Download size={16} /> Download ITR package
            </>
          )}
        </Button>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Hand this to your CA. Everything they need is in here.
          {lastGenerated ? ` · Last generated: ${lastGenerated}` : ' · Last generated: Never'}
        </p>
      </div>
    </div>
  )
}
