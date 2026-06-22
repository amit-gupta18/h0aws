'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

type Customer = {
  id: string
  name: string
  phone: string | null
  gstin: string | null
  stateCode: string | null
  billingAddress: string | null
}

type CreateCustomerInput = {
  name: string
  phone?: string
  gstin?: string
  stateCode?: string
  billingAddress?: string
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

export function useCustomerSearch(query: string, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['customers', activeBusinessId, 'search', query],
    queryFn: () =>
      apiCall(() =>
        api.get(`customers${query ? `?search=${encodeURIComponent(query)}` : ''}`).json<{ data: Customer[] }>()
      ),
    enabled: !!accessToken && !!activeBusinessId && enabled,
    staleTime: 30000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      apiCall(() => api.post('customers', { json: data }).json<Customer>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', activeBusinessId] })
    },
  })
}

export type { Customer, CreateCustomerInput }
