'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type PurchaseBill = {
  id: string
  supplierName: string
  supplierGstin: string | null
  supplierStateCode: string | null
  billNumber: string
  billDate: string
  transactionType: string
  taxableAmount: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  grandTotal: number
  notes: string | null
  createdAt: string
}

type PaginatedResponse = {
  data: PurchaseBill[]
  total: number
  page: number
  limit: number
}

export type PurchaseFilters = {
  page?: number
  limit?: number
  search?: string
  from?: string
  to?: string
}

export type CreatePurchaseInput = {
  supplierName: string
  supplierGstin?: string
  supplierStateCode?: string
  billNumber: string
  billDate: string
  transactionType?: 'INTRA_STATE' | 'INTER_STATE'
  taxableAmount: number
  cgstTotal?: number
  sgstTotal?: number
  igstTotal?: number
  grandTotal: number
  notes?: string
}

export type UpdatePurchaseInput = CreatePurchaseInput

async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HTTPError) {
      const body = await err.response.json<{ error?: string }>().catch((): { error?: string } => ({}))
      throw new Error(typeof body.error === 'string' ? body.error : 'Something went wrong')
    }
    throw new Error('Could not reach the server')
  }
}

function buildUrl(filters: PurchaseFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const q = params.toString()
  return `purchases${q ? `?${q}` : ''}`
}

export function usePurchases(filters: PurchaseFilters = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['purchases', activeBusinessId, filters],
    queryFn: () => apiCall(() => api.get(buildUrl(filters)).json<PaginatedResponse>()),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: CreatePurchaseInput) =>
      apiCall(() => api.post('purchases', { json: data }).json<PurchaseBill>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['gst-summary', activeBusinessId] })
    },
  })
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePurchaseInput }) =>
      apiCall(() => api.put(`purchases/${id}`, { json: data }).json<PurchaseBill>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['gst-summary', activeBusinessId] })
    },
  })
}

export function useDeletePurchase() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (id: string) =>
      apiCall(() => api.delete(`purchases/${id}`).json<{ id: string }>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['gst-summary', activeBusinessId] })
    },
  })
}

export function periodRange(month: number, year: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}
