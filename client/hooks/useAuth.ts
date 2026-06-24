'use client'

import { useMutation } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Membership } from '@/shared/types'

type AuthResponse = {
  accessToken: string
  user: { id: string; email: string }
  memberships: Membership[]
}

type ApiErrorBody = {
  error?: string | { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
}

function parseApiError(body: ApiErrorBody): string {
  const { error } = body
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const fieldMessage = Object.values(error.fieldErrors ?? {}).flat()[0]
    if (fieldMessage) return fieldMessage
    const formMessage = error.formErrors?.[0]
    if (formMessage) return formMessage
  }
  return 'Something went wrong'
}

async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HTTPError) {
      const body = await err.response.json<ApiErrorBody>().catch((): ApiErrorBody => ({}))
      throw new Error(parseApiError(body))
    }
    throw new Error('Could not reach the server')
  }
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiCall(() =>
        api.post('auth/login', { json: data, credentials: 'include' }).json<AuthResponse>()
      ),
    onSuccess: ({ accessToken, user, memberships }) =>
      setSession({ userId: user.id, email: user.email, accessToken, memberships }),
  })
}

export function useSignup() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (data: { email: string; password: string; phone?: string }) =>
      apiCall(() =>
        api.post('auth/signup', { json: data, credentials: 'include' }).json<AuthResponse>()
      ),
    onSuccess: ({ accessToken, user, memberships }) =>
      setSession({ userId: user.id, email: user.email, accessToken, memberships }),
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  return useMutation({
    mutationFn: () =>
      apiCall(() => api.post('auth/logout', { credentials: 'include' }).json<void>()),
    onSuccess: () => clearAuth(),
    onError: () => clearAuth(),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { phone: string }) =>
      apiCall(() =>
        api.post('auth/forgot-password', { json: data }).json<{ message: string }>()
      ),
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: (data: { phone: string; otp: string }) =>
      apiCall(() =>
        api.post('auth/verify-otp', { json: data }).json<{ resetToken: string }>()
      ),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { resetToken: string; newPassword: string }) =>
      apiCall(() =>
        api.post('auth/reset-password', { json: data }).json<{ message: string }>()
      ),
  })
}
