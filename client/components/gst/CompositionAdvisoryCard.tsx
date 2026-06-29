'use client'

import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CompositionAdvisory } from '@/hooks/useGstIntelligence'
import { fmt } from './gst-utils'

export function CompositionAdvisoryCard({
  data,
  isLoading,
}: {
  data?: CompositionAdvisory
  isLoading: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Checking composition scheme eligibility…
      </div>
    )
  }

  if (!data) return null

  const showBanner = data.eligible && data.potentialSavings > 10_000

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        showBanner
          ? 'border-success/40 bg-success/10'
          : 'border-border bg-card'
      )}
    >
      <div className="flex gap-3">
        <Lightbulb
          className={cn(
            'h-5 w-5 shrink-0 mt-0.5',
            showBanner ? 'text-success' : 'text-primary'
          )}
        />
        <div className="flex-1 min-w-0">
          {showBanner && (
            <p className="text-sm font-semibold text-success mb-1">
              Potential savings: {fmt(data.potentialSavings)} / year under composition scheme
            </p>
          )}
          <p className="text-sm text-foreground">{data.aiAdvice}</p>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? 'Hide details' : 'Scheme details'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expanded && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Current GST ({data.fyLabel})</p>
                <p className="font-mono font-semibold">{fmt(data.currentGSTPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Composition tax (1%)</p>
                <p className="font-mono font-semibold">{fmt(data.compositionTax)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual turnover</p>
                <p className="font-mono font-semibold">{fmt(data.annualTurnover)}</p>
              </div>
              <div className="sm:col-span-3">
                <p className="text-xs text-muted-foreground mb-1">Restrictions</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4">
                  {data.schemeDetails.restrictions.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <a
                href="https://www.gst.gov.in/help/composition"
                target="_blank"
                rel="noopener noreferrer"
                className="sm:col-span-3 text-xs text-primary hover:underline"
              >
                Learn how to switch on GST portal →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
