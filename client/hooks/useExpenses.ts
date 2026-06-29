'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type Expense = {
  id: string
  category: string
  amount: number
  description: string | null
  expenseDate: string
  createdAt: string
}

type PaginatedResponse = {
  data: Expense[]
  total: number
  page: number
  limit: number
}

export type ExpenseFilters = {
  page?: number
  limit?: number
  search?: string
  from?: string
  to?: string
}

export type CreateExpenseInput = {
  category: string
  amount: number
  expenseDate: string
  description?: string
}

export type UpdateExpenseInput = CreateExpenseInput

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

function buildUrl(filters: ExpenseFilters) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.search) params.set('search', filters.search)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const q = params.toString()
  return `expenses${q ? `?${q}` : ''}`
}

export function useExpenses(filters: ExpenseFilters = {}) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['expenses', activeBusinessId, filters],
    queryFn: () => apiCall(() => api.get(buildUrl(filters)).json<PaginatedResponse>()),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      apiCall(() => api.post('expenses', { json: data }).json<Expense>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['insights', activeBusinessId] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseInput }) =>
      apiCall(() => api.put(`expenses/${id}`, { json: data }).json<Expense>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['insights', activeBusinessId] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (id: string) =>
      apiCall(() => api.delete(`expenses/${id}`).json<{ id: string }>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['insights', activeBusinessId] })
    },
  })
}
