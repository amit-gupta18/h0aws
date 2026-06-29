'use client'

import { useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type InsightsSummary = {
  period: { from: string; to: string }
  sales: {
    revenue: number
    invoiceCount: number
    avgTicketSize: number
    cancelledCount: number
    monthlyTrend: { month: string; revenue: number; count: number }[]
    paymentModes: { mode: string; amount: number; count: number }[]
    topCustomers: { customerId: string | null; name: string; revenue: number; count: number }[]
    topProducts: { productId: string | null; name: string; revenue: number; quantity: number }[]
  }
  gst: {
    taxableAmount: number
    cgstTotal: number
    sgstTotal: number
    igstTotal: number
    byRate: { rate: number; taxable: number; tax: number }[]
    hsnSummary: { hsn: string; taxable: number; tax: number }[]
    interStateRevenue: number
    intraStateRevenue: number
    b2bRevenue: number
    b2cRevenue: number
  }
  expenses: {
    total: number
    count: number
    byCategory: { category: string; amount: number }[]
  }
  pnl: {
    grossRevenue: number
    totalExpenses: number
    netProfit: number
  }
}

async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HTTPError) {
      const body = await err.response.json<{ error?: string }>().catch((): { error?: string } => ({}))
      throw new Error(body.error ?? 'Something went wrong')
    }
    throw new Error('Could not reach the server')
  }
}

export function useInsightsSummary(from: string, to: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['insights', activeBusinessId, from, to],
    queryFn: () =>
      apiCall(() =>
        api.get(`insights/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).json<InsightsSummary>()
      ),
    enabled: !!accessToken && !!activeBusinessId && enabled && !!from && !!to,
  })
}

export function getMonthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]!
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]!
  return { from, to }
}

export function getLastMonthRange(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return getMonthRange(d)
}

export function getQuarterRange(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3)
  const from = new Date(date.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]!
  const to = new Date(date.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0]!
  return { from, to }
}
