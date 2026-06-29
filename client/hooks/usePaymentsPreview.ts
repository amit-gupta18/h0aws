'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useAuthStore } from '@/store/authStore'

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT'

export type LocalPayment = {
  id: string
  invoiceId: string
  amount: number
  mode: PaymentMode
  paymentDate: string
  notes?: string
  createdAt: string
}

export type ReminderChannel = 'WHATSAPP' | 'SMS'

export type LocalReminder = {
  id: string
  invoiceId: string
  channel: ReminderChannel
  message: string
  createdAt: string
}

type StoreData = {
  payments: LocalPayment[]
  reminders: LocalReminder[]
}

const EMPTY: StoreData = { payments: [], reminders: [] }

function storageKey(businessId: string) {
  return `rakhat-payments-preview:${businessId}`
}

function readStore(businessId: string | null): StoreData {
  if (!businessId || typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(storageKey(businessId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as StoreData
    return {
      payments: parsed.payments ?? [],
      reminders: parsed.reminders ?? [],
    }
  } catch {
    return EMPTY
  }
}

function writeStore(businessId: string, data: StoreData) {
  localStorage.setItem(storageKey(businessId), JSON.stringify(data))
  window.dispatchEvent(new Event('rakhat-payments-preview'))
}

let snapshot: StoreData = EMPTY
let snapshotBusinessId: string | null = null

function getSnapshot(businessId: string | null) {
  if (businessId !== snapshotBusinessId) {
    snapshotBusinessId = businessId
    snapshot = readStore(businessId)
  }
  return snapshot
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('rakhat-payments-preview', onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener('rakhat-payments-preview', onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function usePaymentsPreview() {
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  const store = useSyncExternalStore(
    subscribe,
    () => getSnapshot(activeBusinessId),
    () => EMPTY
  )

  const recordPayment = useCallback(
    (input: Omit<LocalPayment, 'id' | 'createdAt'>) => {
      if (!activeBusinessId) return
      const current = readStore(activeBusinessId)
      const payment: LocalPayment = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      writeStore(activeBusinessId, {
        ...current,
        payments: [payment, ...current.payments],
      })
    },
    [activeBusinessId]
  )

  const logReminder = useCallback(
    (input: Omit<LocalReminder, 'id' | 'createdAt'>) => {
      if (!activeBusinessId) return
      const current = readStore(activeBusinessId)
      const reminder: LocalReminder = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      writeStore(activeBusinessId, {
        ...current,
        reminders: [reminder, ...current.reminders],
      })
    },
    [activeBusinessId]
  )

  const paidByInvoice = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of store.payments) {
      map.set(p.invoiceId, (map.get(p.invoiceId) ?? 0) + p.amount)
    }
    return map
  }, [store.payments])

  return {
    payments: store.payments,
    reminders: store.reminders,
    paidByInvoice,
    recordPayment,
    logReminder,
    isPreview: true as const,
  }
}

export function buildReminderMessage(params: {
  customerName: string
  businessName: string
  invoiceNumber: string
  invoiceDate: string
  balance: number
}) {
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(params.balance)

  return (
    `Hi ${params.customerName},\n\n` +
    `This is a friendly reminder from ${params.businessName} regarding invoice *${params.invoiceNumber}* ` +
    `dated ${params.invoiceDate} for *${amount}*.\n\n` +
    `Please arrange payment at your earliest convenience. Reply to this message if you have already paid.\n\n` +
    `Thank you!`
  )
}

export function daysSince(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}

export function dueLabel(invoiceDate: string, balance: number) {
  if (balance <= 0) return { label: 'Paid', tone: 'paid' as const }
  const days = daysSince(invoiceDate)
  if (days > 30) return { label: `${days}d overdue`, tone: 'overdue' as const }
  if (days > 14) return { label: 'Due soon', tone: 'due' as const }
  return { label: 'Open', tone: 'open' as const }
}

/** CREDIT invoices start unpaid; others start fully paid until user records otherwise. */
export function initialPaidAmount(paymentMode: string, grandTotal: number) {
  return paymentMode === 'CREDIT' ? 0 : grandTotal
}
