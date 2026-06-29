'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useInvoices } from '@/hooks/useInvoices'
import { useCustomerSearch } from '@/hooks/useCustomers'
import { useBusinesses } from '@/hooks/useBusinesses'
import { useAuthStore } from '@/store/authStore'
import { useActiveRole } from '@/store/authStore'
import {
  usePaymentsPreview,
  buildReminderMessage,
  dueLabel,
  initialPaidAmount,
  type PaymentMode,
  type LocalPayment,
} from '@/hooks/usePaymentsPreview'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  X,
  MessageCircle,
  Smartphone,
  Copy,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'outstanding' | 'history' | 'reminders'

type InvoiceRow = {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string
  customerPhone: string | null
  grandTotal: number
  paid: number
  balance: number
  paymentMode: string
  status: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PaymentsPage() {
  const role = useActiveRole()
  const canEdit = role === 'OWNER' || role === 'ACCOUNTANT'

  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const { data: bizData } = useBusinesses()
  const businessName =
    bizData?.memberships.find((m) => m.businessId === activeBusinessId)?.tradeName ?? 'Your business'

  const [tab, setTab] = useState<Tab>('outstanding')
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null)
  const [remindInvoice, setRemindInvoice] = useState<InvoiceRow | null>(null)
  const [copied, setCopied] = useState(false)

  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<PaymentMode>('UPI')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]!)
  const [payNotes, setPayNotes] = useState('')

  const { data: invoiceData, isLoading } = useInvoices({ status: 'ISSUED', limit: 100 })
  const { data: customerData } = useCustomerSearch('')
  const { payments, reminders, paidByInvoice, recordPayment, logReminder } = usePaymentsPreview()

  const phoneByCustomerName = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of customerData?.data ?? []) {
      if (c.phone) map.set(c.name, c.phone)
    }
    return map
  }, [customerData])

  const invoiceRows = useMemo((): InvoiceRow[] => {
    return (invoiceData?.data ?? []).map((inv) => {
      const customerName = inv.customerName ?? 'Walk-in Customer'
      const basePaid = initialPaidAmount(inv.paymentMode, inv.grandTotal)
      const recorded = paidByInvoice.get(inv.id) ?? 0
      const paid = inv.paymentMode === 'CREDIT' ? recorded : Math.max(basePaid, recorded)
      const balance = Math.max(0, inv.grandTotal - paid)

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        customerName,
        customerPhone: phoneByCustomerName.get(customerName) ?? null,
        grandTotal: inv.grandTotal,
        paid,
        balance,
        paymentMode: inv.paymentMode,
        status: inv.status,
      }
    })
  }, [invoiceData, paidByInvoice, phoneByCustomerName])

  const outstanding = useMemo(
    () => invoiceRows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance),
    [invoiceRows]
  )

  const stats = useMemo(() => {
    const totalOutstanding = outstanding.reduce((s, r) => s + r.balance, 0)
    const overdue = outstanding.filter((r) => dueLabel(r.invoiceDate, r.balance).tone === 'overdue')
    const overdueAmount = overdue.reduce((s, r) => s + r.balance, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const collectedThisMonth = payments
      .filter((p) => new Date(p.paymentDate) >= monthStart)
      .reduce((s, p) => s + p.amount, 0)

    return {
      totalOutstanding,
      overdueCount: overdue.length,
      overdueAmount,
      collectedThisMonth,
    }
  }, [outstanding, payments])

  const paymentRows = useMemo(() => {
    const byId = new Map(invoiceRows.map((r) => [r.id, r]))
    return payments
      .map((p) => ({ payment: p, invoice: byId.get(p.invoiceId) }))
      .filter((row): row is { payment: LocalPayment; invoice: InvoiceRow } => !!row.invoice)
  }, [payments, invoiceRows])

  const reminderRows = useMemo(() => {
    const byId = new Map(invoiceRows.map((r) => [r.id, r]))
    return reminders
      .map((r) => ({ reminder: r, invoice: byId.get(r.invoiceId) }))
      .filter((row): row is { reminder: (typeof reminders)[0]; invoice: InvoiceRow } => !!row.invoice)
  }, [reminders, invoiceRows])

  function openRecordPayment(row: InvoiceRow) {
    setPayInvoice(row)
    setPayAmount(String(row.balance))
    setPayMode('UPI')
    setPayDate(new Date().toISOString().split('T')[0]!)
    setPayNotes('')
  }

  function closeRecordPayment() {
    setPayInvoice(null)
  }

  function openReminder(row: InvoiceRow) {
    setRemindInvoice(row)
    setCopied(false)
  }

  function closeReminder() {
    setRemindInvoice(null)
    setCopied(false)
  }

  const reminderMessage =
    remindInvoice &&
    buildReminderMessage({
      customerName: remindInvoice.customerName,
      businessName,
      invoiceNumber: remindInvoice.invoiceNumber,
      invoiceDate: remindInvoice.invoiceDate,
      balance: remindInvoice.balance,
    })

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payInvoice) return

    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0 || amount > payInvoice.balance) return

    recordPayment({
      invoiceId: payInvoice.id,
      amount,
      mode: payMode,
      paymentDate: payDate,
      notes: payNotes.trim() || undefined,
    })
    closeRecordPayment()
  }

  function handleCopyReminder() {
    if (!reminderMessage) return
    navigator.clipboard.writeText(reminderMessage)
    setCopied(true)
  }

  function handleLogReminder(channel: 'WHATSAPP' | 'SMS') {
    if (!remindInvoice || !reminderMessage) return
    logReminder({
      invoiceId: remindInvoice.id,
      channel,
      message: reminderMessage,
    })
    closeReminder()
  }

  const parsedPayAmount = parseFloat(payAmount)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Outstanding dues, collections, and payment reminders
        </p>
      </div>

      <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet size={16} />
            <span className="text-xs uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {isLoading ? '—' : fmt(stats.totalOutstanding)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''} with balance
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <AlertCircle size={16} />
            <span className="text-xs uppercase tracking-wider">Overdue</span>
          </div>
          <p className="text-2xl font-bold font-mono text-destructive">
            {isLoading ? '—' : fmt(stats.overdueAmount)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.overdueCount} over 30 days
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle2 size={16} />
            <span className="text-xs uppercase tracking-wider">Collected (local)</span>
          </div>
          <p className="text-2xl font-bold font-mono text-success">
            {fmt(stats.collectedThisMonth)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This month — preview records</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-full sm:w-fit overflow-x-auto">
        {(
          [
            ['outstanding', 'Outstanding', outstanding.length],
            ['history', 'Payment history', paymentRows.length],
            ['reminders', 'Reminders', reminderRows.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
            {count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-mono">{count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'outstanding' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : outstanding.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <CheckCircle2 size={36} className="text-success/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No outstanding balances</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Credit invoices appear here. Record payments as customers settle.
              </p>
              <Link
                href="/dashboard/sales/invoices"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 inline-flex')}
              >
                View invoices
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['Invoice', 'Customer', 'Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(
                      (h) => (
                        <th
                          key={h || 'actions'}
                          className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {outstanding.map((row) => {
                    const due = dueLabel(row.invoiceDate, row.balance)
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/sales/invoices/${row.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {row.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.customerName}</p>
                          {row.customerPhone && (
                            <p className="text-xs text-muted-foreground">{row.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {row.invoiceDate}
                        </td>
                        <td className="px-4 py-3 font-mono">{fmt(row.grandTotal)}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {fmt(row.paid)}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">{fmt(row.balance)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              due.tone === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              due.tone === 'due' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                              due.tone === 'open' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}
                          >
                            {due.tone === 'overdue' && <AlertCircle size={12} />}
                            {due.tone === 'due' && <Clock size={12} />}
                            {due.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1"
                                onClick={() => openRecordPayment(row)}
                              >
                                <Plus size={14} />
                                Record
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 gap-1"
                                onClick={() => openReminder(row)}
                              >
                                <Bell size={14} />
                                Remind
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {paymentRows.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm text-muted-foreground">
              No payments recorded yet. Use &quot;Record&quot; on an outstanding invoice.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['When', 'Invoice', 'Customer', 'Amount', 'Mode', 'Notes'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paymentRows.map(({ payment, invoice }) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(payment.createdAt)}
                        <span className="block text-xs">Paid {payment.paymentDate}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{invoice.customerName}</td>
                      <td className="px-4 py-3 font-mono font-medium text-success">
                        {fmt(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.mode}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                        {payment.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'reminders' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {reminderRows.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <MessageCircle size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No reminders sent yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Use &quot;Remind&quot; on outstanding invoices. WhatsApp send will connect when the
                integration ships — for now, copy the message or log a preview send.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['When', 'Invoice', 'Customer', 'Channel', 'Message preview'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reminderRows.map(({ reminder, invoice }) => (
                    <tr key={reminder.id}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(reminder.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{invoice.customerName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          {reminder.channel === 'WHATSAPP' ? (
                            <MessageCircle size={14} />
                          ) : (
                            <Smartphone size={14} />
                          )}
                          {reminder.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[280px] truncate">
                        {reminder.message.split('\n')[0]}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {payInvoice && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Record payment</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {payInvoice.invoiceNumber} — balance {fmt(payInvoice.balance)}
                </p>
              </div>
              <button type="button" onClick={closeRecordPayment} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Amount *</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={payInvoice.balance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Mode</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Payment date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Notes</label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Optional reference / UTR"
                  className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeRecordPayment}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !payAmount ||
                    parsedPayAmount <= 0 ||
                    parsedPayAmount > payInvoice.balance ||
                    Number.isNaN(parsedPayAmount)
                  }
                >
                  Save payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {remindInvoice && reminderMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Payment reminder</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {remindInvoice.invoiceNumber} — {fmt(remindInvoice.balance)} due
                </p>
              </div>
              <button type="button" onClick={closeReminder} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {reminderMessage}
            </div>

            {remindInvoice.customerPhone ? (
              <p className="text-xs text-muted-foreground mt-2">
                Customer phone: {remindInvoice.customerPhone}
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                No phone on file — add customer phone to enable one-tap WhatsApp later.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="gap-2 flex-1"
                onClick={handleCopyReminder}
              >
                <Copy size={16} />
                {copied ? 'Copied!' : 'Copy message'}
              </Button>
              <Button
                type="button"
                className="gap-2 flex-1"
                disabled
                title="WhatsApp Business API integration coming soon"
              >
                <MessageCircle size={16} />
                Send WhatsApp
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-2 flex-1"
                disabled
                title="SMS integration coming soon"
              >
                <Smartphone size={16} />
                Send SMS
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Preview: log a reminder locally to test the reminders tab.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeReminder}>
                Close
              </Button>
              <Button type="button" onClick={() => handleLogReminder('WHATSAPP')}>
                Log preview send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
