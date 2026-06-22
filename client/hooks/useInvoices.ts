'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

type InvoiceListItem = {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName: string | null
  grandTotal: number
  status: string
  paymentMode: string
  createdAt: string
}

type InvoiceListResponse = {
  data: InvoiceListItem[]
  total: number
  page: number
  limit: number
}

type InvoiceItem = {
  id: string
  nameSnapshot: string
  hsnSnapshot: string | null
  unitSnapshot: string | null
  quantity: number
  unitPrice: number
  discount: number
  gstRate: number
  taxableValue: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  lineTotal: number
}

type InvoiceDetail = {
  id: string
  invoiceNumber: string
  invoiceDate: string
  documentType: string
  transactionType: string
  business: {
    tradeName: string
    legalName: string | null
    gstin: string | null
    address: string | null
    stateCode: string
    phone: string | null
    logoUrl: string | null
  }
  customer: {
    id: string
    name: string
    gstin: string | null
    billingAddress: string | null
    stateCode: string | null
  } | null
  items: InvoiceItem[]
  subtotal: number
  discountTotal: number
  taxableAmount: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  grandTotal: number
  paymentMode: string
  notes: string | null
  status: string
  pdfUrl: string | null
  createdAt: string
}

type CreateInvoiceInput = {
  clientBillId: string
  customerId?: string
  invoiceDate: string
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT'
  notes?: string
  items: {
    productId?: string
    name: string
    hsn?: string
    unit?: string
    quantity: number
    unitPrice: number
    discount?: number
    gstRate: 0 | 5 | 12 | 18 | 28
  }[]
}

type InvoiceFilters = {
  page?: number
  limit?: number
  status?: 'ISSUED' | 'CANCELLED'
  from?: string
  to?: string
  search?: string
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

export function useInvoices(filters: InvoiceFilters = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  const searchParams = new URLSearchParams()
  if (filters.page) searchParams.set('page', String(filters.page))
  if (filters.limit) searchParams.set('limit', String(filters.limit))
  if (filters.status) searchParams.set('status', filters.status)
  if (filters.from) searchParams.set('from', filters.from)
  if (filters.to) searchParams.set('to', filters.to)
  if (filters.search) searchParams.set('search', filters.search)

  const query = searchParams.toString()

  return useQuery({
    queryKey: ['invoices', activeBusinessId, filters],
    queryFn: () =>
      apiCall(() => api.get(`invoices${query ? `?${query}` : ''}`).json<InvoiceListResponse>()),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useInvoice(id: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['invoices', activeBusinessId, id],
    queryFn: () => apiCall(() => api.get(`invoices/${id}`).json<InvoiceDetail>()),
    enabled: !!accessToken && !!activeBusinessId && !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) =>
      apiCall(() => api.post('invoices', { json: data }).json<InvoiceDetail>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeBusinessId] })
    },
  })
}

export function useCancelInvoice() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (id: string) =>
      apiCall(() => api.patch(`invoices/${id}/cancel`).json<{ id: string; status: string }>()),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['invoices', activeBusinessId, id] })
    },
  })
}

export function useInvoicePdf(id: string, enabled = false) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['invoices', activeBusinessId, id, 'pdf'],
    queryFn: () => apiCall(() => api.get(`invoices/${id}/pdf`).json<{ url: string }>()),
    enabled: !!accessToken && !!activeBusinessId && !!id && enabled,
  })
}

export type { InvoiceListItem, InvoiceDetail, CreateInvoiceInput, InvoiceFilters }
