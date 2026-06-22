'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

type Product = {
  id: string
  name: string
  hsnCode: string | null
  unit: string
  sellingPrice: number
  gstRate: number
  quantity: number
  location: string | null
}

type CreateProductInput = {
  name: string
  sellingPrice: number
  gstRate: 0 | 5 | 12 | 18 | 28
  unit: string
  hsnCode?: string
  category?: string
  quantity?: number
  location?: string
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

export function useProductSearch(query: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['products', activeBusinessId, 'search', query],
    queryFn: () =>
      apiCall(() =>
        api.get(`products${query ? `?search=${encodeURIComponent(query)}` : ''}`).json<{ data: Product[] }>()
      ),
    enabled: !!accessToken && !!activeBusinessId && enabled,
    staleTime: 30000,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      apiCall(() => api.post('products', { json: data }).json<Product>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', activeBusinessId] })
    },
  })
}

export type { Product, CreateProductInput }
