'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  useInsightsSummary,
  getMonthRange,
  getLastMonthRange,
  getQuarterRange,
} from '@/hooks/useInsights'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Receipt, Wallet, PiggyBank } from 'lucide-react'

type PeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'custom'

const PIE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function tooltipCurrency(value: unknown) {
  return fmt(Number(value ?? 0))
}

function fmtMonth(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

export default function InsightsPage() {
  const [preset, setPreset] = useState<PeriodPreset>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const period = useMemo(() => {
    if (preset === 'this_month') return getMonthRange()
    if (preset === 'last_month') return getLastMonthRange()
    if (preset === 'this_quarter') return getQuarterRange()
    return { from: customFrom, to: customTo }
  }, [preset, customFrom, customTo])

  const { data, isLoading, error } = useInsightsSummary(
    period.from,
    period.to,
    preset !== 'custom' || (!!customFrom && !!customTo)
  )

  const totalGst = data
    ? data.gst.cgstTotal + data.gst.sgstTotal + data.gst.igstTotal
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue, GST summary, and profit & loss for your business.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['this_month', 'This month'],
              ['last_month', 'Last month'],
              ['this_quarter', 'This quarter'],
              ['custom', 'Custom'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                preset === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <span className="self-center text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<Receipt size={18} />}
              label="Revenue"
              value={fmt(data.sales.revenue)}
              sub={`${data.sales.invoiceCount} invoices · avg ${fmt(data.sales.avgTicketSize)}`}
            />
            <SummaryCard
              icon={<TrendingUp size={18} />}
              label="Total GST"
              value={fmt(totalGst)}
              sub={`Taxable ${fmt(data.gst.taxableAmount)}`}
            />
            <SummaryCard
              icon={<Wallet size={18} />}
              label="Expenses"
              value={fmt(data.expenses.total)}
              sub={`${data.expenses.count} entries`}
            />
            <SummaryCard
              icon={data.pnl.netProfit >= 0 ? <PiggyBank size={18} /> : <TrendingDown size={18} />}
              label="Net profit"
              value={fmt(data.pnl.netProfit)}
              sub="Revenue − expenses"
              highlight={data.pnl.netProfit >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Monthly revenue">
              {data.sales.monthlyTrend.length === 0 ? (
                <EmptyChart message="No sales in this period" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.sales.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={tooltipCurrency as never}
                      labelFormatter={(label) => fmtMonth(String(label))}
                    />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Payment modes">
              {data.sales.paymentModes.length === 0 ? (
                <EmptyChart message="No payment data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.sales.paymentModes}
                      dataKey="amount"
                      nameKey="mode"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ mode, percent }) => `${mode} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {data.sales.paymentModes.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipCurrency as never} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="Top customers"
              headers={['Customer', 'Invoices', 'Revenue']}
              rows={data.sales.topCustomers.map((c) => [c.name, String(c.count), fmt(c.revenue)])}
              empty="No customer data"
            />
            <DataTable
              title="Top products"
              headers={['Product', 'Qty', 'Revenue']}
              rows={data.sales.topProducts.map((p) => [p.name, String(p.quantity), fmt(p.revenue)])}
              empty="No product sales"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DataTable
              title="GST by rate"
              headers={['Rate', 'Taxable', 'Tax']}
              rows={data.gst.byRate.map((r) => [`${r.rate}%`, fmt(r.taxable), fmt(r.tax)])}
              empty="No GST data"
            />
            <DataTable
              title="Expenses by category"
              headers={['Category', 'Amount']}
              rows={data.expenses.byCategory.map((e) => [e.category, fmt(e.amount)])}
              empty="No expenses in period"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Inter-state sales" value={fmt(data.gst.interStateRevenue)} />
            <MiniStat label="Intra-state sales" value={fmt(data.gst.intraStateRevenue)} />
            <MiniStat label="B2B (with GSTIN)" value={fmt(data.gst.b2bRevenue)} />
            <MiniStat label="B2C / walk-in" value={fmt(data.gst.b2cRevenue)} />
          </div>

          {data.gst.hsnSummary.length > 0 && (
            <DataTable
              title="HSN-wise summary (top 10)"
              headers={['HSN', 'Taxable', 'Tax']}
              rows={data.gst.hsnSummary.map((h) => [h.hsn, fmt(h.taxable), fmt(h.tax)])}
            />
          )}

          {data.sales.cancelledCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {data.sales.cancelledCount} cancelled invoice{data.sales.cancelledCount !== 1 ? 's' : ''} in this period (excluded from revenue).
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  highlight?: 'positive' | 'negative'
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(
          'text-2xl font-semibold font-mono',
          highlight === 'positive' && 'text-green-600 dark:text-green-400',
          highlight === 'negative' && 'text-destructive'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">{message}</div>
  )
}

function DataTable({
  title,
  headers,
  rows,
  empty = 'No data',
}: {
  title: string
  headers: string[]
  rows: string[][]
  empty?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left font-medium text-muted-foreground last:text-right"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn('px-4 py-2.5', j === row.length - 1 && 'text-right font-mono')}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold font-mono mt-1">{value}</p>
    </div>
  )
}
