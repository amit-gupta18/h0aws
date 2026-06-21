'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Membership } from '@/shared/types'

type CreateBusinessResponse = {
  business: { id: string; tradeName: string }
  membership: Membership
}

type CreateBusinessInput = {
  tradeName: string
  stateCode: string
  invoicePrefix: string
  legalName?: string
  gstin?: string
  address?: string
  phone?: string
}

async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HTTPError) {
      const body = await err.response.json<{ error?: string }>().catch(() => ({}))
      throw new Error(body.error ?? 'Something went wrong')
    }
    throw new Error('Could not reach the server')
  }
}

export function useBusinesses() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () =>
      apiCall(() => api.get('businesses').json<{ memberships: Membership[] }>()),
    enabled: !!accessToken,
  })
}

export function useCreateBusiness() {
  const addMembership = useAuthStore((s) => s.addMembership)
  return useMutation({
    mutationFn: (data: CreateBusinessInput) =>
      apiCall(() =>
        api.post('businesses', { json: data }).json<CreateBusinessResponse>()
      ),
    onSuccess: ({ membership }) => addMembership(membership),
  })
}
