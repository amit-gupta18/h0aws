'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useInvoices } from '@/hooks/useInvoices'
import { useAuthStore } from '@/store/authStore'
import { useBusinesses } from '@/hooks/useBusinesses'
import { useCustomerSearch } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function getMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

function getMonthName() {
  return new Date().toLocaleDateString('en-IN', { month: 'long' })
}

export default function DashboardHome() {
  const memberships = useAuthStore((s) => s.memberships)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const { data: bizData } = useBusinesses()
  const allMemberships = bizData?.memberships ?? memberships
  const biz = allMemberships.find((m) => m.businessId === activeBusinessId)

  const { from, to } = useMemo(() => getMonthRange(), [])
  const monthName = useMemo(() => getMonthName(), [])

  const { data: recentData, isLoading: recentLoading } = useInvoices({ limit: 5 })
  const { data: monthData, isLoading: monthLoading } = useInvoices({ from, to, limit: 100 })
  const { data: customersData, isLoading: customersLoading } = useCustomerSearch('')

  const recentInvoices = recentData?.data ?? []
  const monthInvoices = monthData?.data ?? []
  const totalInvoices = recentData?.total ?? 0
  const totalCustomers = customersData?.data?.length ?? 0

  const monthRevenue = monthInvoices.reduce((s, i) => s + i.grandTotal, 0)
  const monthInvoiceCount = monthInvoices.length
  const isLoading = recentLoading || monthLoading

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {biz ? `${biz.tradeName}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening today.</p>
        </div>
        <Button asChild size="lg" className="shrink-0 whitespace-nowrap">
          <Link href="/dashboard/sales/invoices/new" className="flex items-center gap-1.5">
            <Plus size={18} />
            <span>New Invoice</span>
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{monthName} Revenue</p>
          <p className="text-2xl font-bold text-primary font-mono">{isLoading ? '—' : fmt(monthRevenue)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{monthName} Invoices</p>
          <p className="text-2xl font-bold text-foreground font-mono">{isLoading ? '—' : monthInvoiceCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Invoices</p>
          <p className="text-2xl font-bold text-foreground font-mono">{recentLoading ? '—' : totalInvoices}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Customers</p>
          <p className="text-2xl font-bold text-foreground font-mono">{customersLoading ? '—' : totalCustomers}</p>
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

        {recentLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : recentInvoices.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">No invoices yet.</p>
            <Link href="/dashboard/sales/invoices/new" className="text-sm text-primary font-medium hover:underline">
              Create your first invoice →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentInvoices.map((inv) => (
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
