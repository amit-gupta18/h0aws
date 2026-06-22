import { BarChart2 } from 'lucide-react'

export default function InsightsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revenue trends, top customers, and GST reports.</p>
      </div>

      <div className="bg-card border border-border rounded-lg px-6 py-14 text-center">
        <BarChart2 size={36} className="text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-base font-semibold text-foreground mb-2">Analytics coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Monthly revenue charts, top products by sales, customer-wise billing, and GSTR-ready summary reports — all in one place.
        </p>
      </div>
    </div>
  )
}
