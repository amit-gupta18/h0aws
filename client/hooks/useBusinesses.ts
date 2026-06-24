'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Membership, Role } from '@/shared/types'

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
  gstinType?: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'
  address?: string
  phone?: string
}

type BusinessDetail = {
  id: string
  tradeName: string
  legalName: string | null
  gstin: string | null
  gstinType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'
  address: string | null
  stateCode: string
  phone: string | null
  logoUrl: string | null
  invoicePrefix: string
  role: Role
  createdAt: string
}

type UpdateBusinessInput = {
  tradeName?: string
  legalName?: string | null
  gstin?: string | null
  gstinType?: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'
  address?: string | null
  stateCode?: string
  phone?: string | null
  invoicePrefix?: string
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

export function useBusinesses() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () =>
      apiCall(() => api.get('businesses').json<{ memberships: Membership[] }>()),
    enabled: !!accessToken,
  })
}

export function useBusiness(businessId: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: () =>
      apiCall(() => api.get(`businesses/${businessId}`).json<BusinessDetail>()),
    enabled: !!accessToken && !!businessId,
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

export function useUpdateBusiness() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBusinessInput }) =>
      apiCall(() =>
        api.put(`businesses/${id}`, { json: data }).json<BusinessDetail>()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', activeBusinessId] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export type { BusinessDetail, UpdateBusinessInput }
