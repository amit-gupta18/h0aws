'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useInvoices, type InvoiceFilters } from '@/hooks/useInvoices'
import { Button } from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

export default function InvoicesPage() {
  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading, error } = useInvoices(filters)

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-muted-foreground text-sm">Manage your sales invoices</p>
        </div>
        <Link href="/dashboard/sales/invoices/new" className="w-full sm:w-auto">
          <Button className="w-full shrink-0 whitespace-nowrap sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:gap-4">
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-auto"
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: e.target.value ? (e.target.value as 'ISSUED' | 'CANCELLED') : undefined,
              page: 1,
            }))
          }
        >
          <option value="">All Status</option>
          <option value="ISSUED">Issued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <input
          type="date"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-auto"
          placeholder="From"
          value={filters.from ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))}
        />

        <input
          type="date"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm lg:w-auto"
          placeholder="To"
          value={filters.to ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))}
        />

        <input
          type="text"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2 lg:col-span-1 lg:w-56"
          placeholder="Search invoice #"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-destructive">{error.message}</div>
      ) : !data?.data.length ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No invoices found</p>
          <Link href="/dashboard/sales/invoices/new" className="mt-4 inline-block">
            <Button>Create your first invoice</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/sales/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{invoice.invoiceDate}</td>
                    <td className="px-4 py-3">{invoice.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {invoice.grandTotal.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          invoice.status === 'ISSUED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{invoice.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {(filters.page! - 1) * filters.limit! + 1} -{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
