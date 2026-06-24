'use client'

import { useEffect, useRef } from 'react'
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

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setSession, clearAuth, setHydrated, isHydrated } = useAuthStore()
  const restored = useRef(false)

  useEffect(() => {
    log('useEffect triggered', { restored: restored.current, hasToken: !!accessToken, isHydrated })

    if (restored.current) {
      log('Already restored, skipping')
      return
    }
    restored.current = true

    if (accessToken) {
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
  }, [])

  return <>{children}</>
}
