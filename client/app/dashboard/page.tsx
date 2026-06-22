'use client'

import Link from 'next/link'
import { useInvoices } from '@/hooks/useInvoices'
import { useAuthStore } from '@/store/authStore'
import { useBusinesses } from '@/hooks/useBusinesses'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardHome() {
  const memberships = useAuthStore((s) => s.memberships)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const { data: bizData } = useBusinesses()
  const allMemberships = bizData?.memberships ?? memberships
  const biz = allMemberships.find((m) => m.businessId === activeBusinessId)

  const { data, isLoading } = useInvoices({ limit: 5 })
  const invoices = data?.data ?? []
  const total = data?.total ?? 0

  const revenue = invoices.reduce((s, i) => s + i.grandTotal, 0)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {biz ? `${biz.tradeName}` : 'Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Invoices</p>
          <p className="text-2xl font-bold text-foreground font-mono">{isLoading ? '—' : total}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recent Revenue</p>
          <p className="text-2xl font-bold text-primary font-mono">{isLoading ? '—' : fmt(revenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Last 5 invoices</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/sales/invoices/new" className="text-sm text-primary font-medium hover:underline">
              + New Invoice
            </Link>
            <Link href="/dashboard/customers" className="text-sm text-primary font-medium hover:underline">
              + Add Customer
            </Link>
          </div>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Invoices</h2>
          <Link href="/dashboard/sales/invoices" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">No invoices yet.</p>
            <Link href="/dashboard/sales/invoices/new" className="text-sm text-primary font-medium hover:underline">
              Create your first invoice →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/dashboard/sales/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inv.customerName ?? 'Walk-in'} · {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground font-mono">{fmt(inv.grandTotal)}</p>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    inv.status === 'ISSUED' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
