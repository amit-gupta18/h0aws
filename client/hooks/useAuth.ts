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

function log(message: string, data?: unknown) {
  console.log(`[useAuth] ${message}`, data ?? '')
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

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      log('Login attempt', { email: data.email })
      const result = await apiCall(() =>
        api.post('auth/login', { json: data, credentials: 'include' }).json<AuthResponse>()
      )
      log('Login response received', { userId: result.user.id, memberships: result.memberships.length })
      return result
    },
    onSuccess: ({ accessToken, user, memberships }) => {
      log('Login onSuccess, calling setSession', { userId: user.id, memberships: memberships.length })
      setSession({ userId: user.id, email: user.email, accessToken, memberships })
      log('setSession completed')
    },
    onError: (err) => {
      log('Login error', { error: err.message })
    },
  })
}

export function useSignup() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: async (data: { email: string; password: string; phone?: string }) => {
      log('Signup attempt', { email: data.email })
      const result = await apiCall(() =>
        api.post('auth/signup', { json: data, credentials: 'include' }).json<AuthResponse>()
      )
      log('Signup response received', { userId: result.user.id })
      return result
    },
    onSuccess: ({ accessToken, user, memberships }) => {
      log('Signup onSuccess, calling setSession')
      setSession({ userId: user.id, email: user.email, accessToken, memberships })
    },
    onError: (err) => {
      log('Signup error', { error: err.message })
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  return useMutation({
    mutationFn: async () => {
      log('Logout attempt')
      await apiCall(() => api.post('auth/logout', { credentials: 'include' }).json<void>())
      log('Logout API success')
    },
    onSuccess: () => {
      log('Logout onSuccess, clearing auth')
      clearAuth()
    },
    onError: (err) => {
      log('Logout error, still clearing auth', { error: err.message })
      clearAuth()
    },
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
