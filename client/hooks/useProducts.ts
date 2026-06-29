'use client'

import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
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

type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}

const PAGE_SIZE = 20

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

function buildListUrl(base: string, search: string, page: number) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(PAGE_SIZE))
  if (search) params.set('search', search)
  return `${base}?${params.toString()}`
}

export function useProductSearch(query: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['products', activeBusinessId, 'search', query],
    queryFn: () =>
      apiCall(() =>
        api.get(buildListUrl('products', query, 1)).json<PaginatedResponse<Product>>()
      ),
    enabled: !!accessToken && !!activeBusinessId && enabled,
    staleTime: 30000,
  })
}

export function useInfiniteProducts(search: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useInfiniteQuery({
    queryKey: ['products', activeBusinessId, 'infinite', search],
    queryFn: ({ pageParam }) =>
      apiCall(() =>
        api.get(buildListUrl('products', search, pageParam)).json<PaginatedResponse<Product>>()
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
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

export type { Product, CreateProductInput, PaginatedResponse }
