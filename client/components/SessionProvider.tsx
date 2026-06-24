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

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, setSession, clearAuth, setHydrated, isHydrated } = useAuthStore()
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current) return
    restored.current = true

    if (accessToken) {
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
  }, [])

  return <>{children}</>
}
