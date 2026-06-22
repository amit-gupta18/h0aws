import Link from 'next/link'
import { Wallet } from 'lucide-react'

export default function PaymentsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track payments and outstanding amounts.</p>
      </div>

      <div className="bg-card border border-border rounded-lg px-6 py-14 text-center">
        <Wallet size={36} className="text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-base font-semibold text-foreground mb-2">Payment tracking coming soon</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
          Record partial payments, track dues, and mark invoices as paid. Available in the next update.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/sales/invoices" className="inline-flex items-center justify-center text-sm text-primary font-medium hover:underline">
            View invoices →
          </Link>
        </div>
      </div>
    </div>
  )
}
