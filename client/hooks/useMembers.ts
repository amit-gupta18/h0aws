'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/shared/types'

export type Member = {
  id: string
  userId: string
  email: string
  phone: string | null
  role: Role
  createdAt: string
}

type AddMemberInput = {
  email: string
  password: string
  phone?: string
  role: 'ACCOUNTANT' | 'VIEWER'
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

export function useMembers() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['members', activeBusinessId],
    queryFn: () => apiCall(() => api.get('members').json<{ members: Member[] }>()),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (data: AddMemberInput) =>
      apiCall(() =>
        api.post('members', { json: data }).json<{ member: { userId: string; email: string; role: Role } }>()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', activeBusinessId] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useMutation({
    mutationFn: (id: string) =>
      apiCall(() => api.delete(`members/${id}`).json<{ id: string }>()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', activeBusinessId] })
    },
  })
}
