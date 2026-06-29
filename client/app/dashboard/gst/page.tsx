'use client'

import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  useGstSummary,
  downloadGstExport,
  type GstExportType,
} from '@/hooks/useGst'
import {
  useCompositionAdvisory,
  useReconciliationDemo,
  currentFyStartYear,
} from '@/hooks/useGstIntelligence'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileCheck, Sparkles, Download } from 'lucide-react'
import { CompositionAdvisoryCard } from '@/components/gst/CompositionAdvisoryCard'
import { Gstr1SummaryTab } from '@/components/gst/Gstr1SummaryTab'
import { ReconciliationTab } from '@/components/gst/ReconciliationTab'
import { OcrUploadTab } from '@/components/gst/OcrUploadTab'
import { ItrPackageTab } from '@/components/gst/ItrPackageTab'

type Tab = 'gstr1' | 'reconciliation' | 'automation' | 'itr'

const VALID_TABS: Tab[] = ['gstr1', 'reconciliation', 'automation', 'itr']

function tabFromSearchParams(sp: URLSearchParams): Tab {
  const t = sp.get('tab')
  if (t && VALID_TABS.includes(t as Tab)) return t as Tab
  return 'gstr1'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EXPORT_OPTIONS: { type: GstExportType; label: string }[] = [
  { type: 'gstr1_b2b', label: 'GSTR-1 B2B' },
  { type: 'gstr1_hsn_b2b', label: 'HSN B2B' },
  { type: 'gstr1_hsn_b2c', label: 'HSN B2C' },
  { type: 'gstr2_inward', label: 'GSTR-2 Inward' },
]

export default function GstCompliancePage() {
  const searchParams = useSearchParams()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState<Tab>(() => tabFromSearchParams(searchParams))
  const [exporting, setExporting] = useState<GstExportType | null>(null)

  useEffect(() => {
    setTab(tabFromSearchParams(searchParams))
  }, [searchParams])

  const fyStartYear = currentFyStartYear(now)
  const { data, isLoading, error } = useGstSummary(month, year)
  const composition = useCompositionAdvisory(fyStartYear)
  const reconciliation = useReconciliationDemo(month, year)

  const years = useMemo(() => {
    const y = now.getFullYear()
    return [y - 1, y, y + 1]
  }, [now])

  async function handleExport(type: GstExportType) {
    setExporting(type)
    try {
      await downloadGstExport(month, year, type)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileCheck size={22} />
            GST Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compliance intelligence — automation, advisory, and CA-ready exports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="relative">
            <Button variant="outline" className="gap-2" disabled={!!exporting}>
              <Download size={16} />
              Export CSV
            </Button>
            <select
              className="absolute inset-0 opacity-0 cursor-pointer"
              value=""
              onChange={(e) => {
                const v = e.target.value as GstExportType
                if (v) void handleExport(v)
              }}
            >
              <option value="">Export…</option>
              {EXPORT_OPTIONS.map((o) => (
                <option key={o.type} value={o.type}>
                  {exporting === o.type ? 'Exporting…' : o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <CompositionAdvisoryCard data={composition.data} isLoading={composition.isLoading} />

      {isLoading && (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading GST summary…</div>
      )}
      {error && (
        <div className="text-sm text-destructive py-4">{error.message}</div>
      )}

      {data && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <p className="text-sm text-foreground">{data.aiInsight}</p>
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 overflow-x-auto">
        {(
          [
            ['gstr1', 'GSTR-1 Summary'],
            ['reconciliation', 'Reconciliation'],
            ['automation', 'Automation'],
            ['itr', 'ITR Package'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'gstr1' && data && <Gstr1SummaryTab data={data} />}
      {tab === 'gstr1' && !data && !isLoading && (
        <p className="text-sm text-muted-foreground py-8 text-center">No GST data for this period.</p>
      )}

      {tab === 'reconciliation' && (
        <ReconciliationTab
          data={reconciliation.data}
          isLoading={reconciliation.isLoading}
          error={reconciliation.error}
        />
      )}

      {tab === 'automation' && <OcrUploadTab month={month} year={year} />}

      {tab === 'itr' && <ItrPackageTab />}
    </div>
  )
}
