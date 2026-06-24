'use client'

import { useEffect } from 'react'
import ky from 'ky'
import { useAuthStore } from '@/store/authStore'
import type { Membership } from '@/shared/types'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

interface RefreshResponse {
  accessToken: string
  user: { id: string; email: string }
  memberships: Membership[]
}

function log(message: string, data?: unknown) {
  console.log(`[SessionProvider] ${message}`, data ?? '')
}

let sessionRestoreAttempted = false

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  useEffect(() => {
    const state = useAuthStore.getState()
    log('useEffect triggered', { 
      sessionRestoreAttempted,
      hasToken: !!state.accessToken, 
      isHydrated: state.isHydrated 
    })

    if (sessionRestoreAttempted) {
      log('Session restore already attempted globally, skipping')
      if (!state.isHydrated) {
        setHydrated()
      }
      return
    }
    sessionRestoreAttempted = true

    if (state.isHydrated) {
      log('Already hydrated, skipping')
      return
    }

    if (state.accessToken) {
      log('Token exists in store, marking hydrated')
      setHydrated()
      return
    }

    log('No token, attempting refresh...', { baseUrl: BASE_URL })

    ky.post(`${BASE_URL}/auth/refresh`, { credentials: 'include' })
      .json<RefreshResponse>()
      .then((data) => {
        log('Refresh successful', { userId: data.user.id, memberships: data.memberships.length })
        setSession({
          userId: data.user.id,
          email: data.user.email,
          accessToken: data.accessToken,
          memberships: data.memberships,
        })
      })
      .catch((err) => {
        log('Refresh failed', { error: err instanceof Error ? err.message : String(err) })
        if (!useAuthStore.getState().accessToken) {
          log('No token after refresh failure, clearing auth')
          clearAuth()
        }
      })
  }, [setSession, clearAuth, setHydrated])

  return <>{children}</>
}
