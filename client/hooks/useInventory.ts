'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type InventoryTxType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'MANUAL_ADJUSTMENT'

export type InventoryTransaction = {
  id: string
  type: InventoryTxType
  quantityChange: number
  notes: string | null
  sourceId: string | null
  createdAt: string
  product: { id: string; name: string; unit: string }
  performedBy: { id: string; email: string }
}

type PaginatedResponse = {
  data: InventoryTransaction[]
  total: number
  page: number
  limit: number
}

export type InventoryTransactionFilters = {
  page?: number
  limit?: number
  productId?: string
  type?: InventoryTxType
  from?: string
  to?: string
}

export type AdjustStockInput = {
  productId: string
  quantityChange: number
  notes: string
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

function buildUrl(filters: InventoryTransactionFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.productId) params.set('productId', filters.productId)
  if (filters.type) params.set('type', filters.type)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const q = params.toString()
  return `inventory/transactions${q ? `?${q}` : ''}`
}

export function useInventoryTransactions(filters: InventoryTransactionFilters = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['inventory-transactions', activeBusinessId, filters],
    queryFn: () => apiCall(() => api.get(buildUrl(filters)).json<PaginatedResponse>()),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: AdjustStockInput) =>
      apiCall(() =>
        api.post('inventory/adjustments', { json: data }).json<{
          product: { id: string; name: string; unit: string; quantity: number }
          transaction: InventoryTransaction
        }>()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', activeBusinessId] })
    },
  })
}

export const INVENTORY_TX_LABELS: Record<InventoryTxType, string> = {
  OPENING_STOCK: 'Opening stock',
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  MANUAL_ADJUSTMENT: 'Manual adjustment',
}
