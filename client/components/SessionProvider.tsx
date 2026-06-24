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

let sessionRestoreAttempted = false

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setHydrated = useAuthStore((s) => s.setHydrated)

  useEffect(() => {
    const state = useAuthStore.getState()

    if (sessionRestoreAttempted) {
      if (!state.isHydrated) setHydrated()
      return
    }
    sessionRestoreAttempted = true

    if (state.isHydrated) return

    if (state.accessToken) {
      setHydrated()
      return
    }

    ky.post(`${BASE_URL}/auth/refresh`, { credentials: 'include' })
      .json<RefreshResponse>()
      .then((data) => {
        setSession({
          userId: data.user.id,
          email: data.user.email,
          accessToken: data.accessToken,
          memberships: data.memberships,
        })
      })
      .catch(() => {
        if (!useAuthStore.getState().accessToken) {
          clearAuth()
        }
      })
  }, [setSession, clearAuth, setHydrated])

  return <>{children}</>
}
