'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

function log(message: string, data?: unknown) {
  console.log(`[AuthGuard] ${message}`, data ?? '')
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const memberships = useAuthStore((s) => s.memberships)

  useEffect(() => {
    log('State changed', { isHydrated, hasToken: !!accessToken, memberships: memberships.length })

    if (!isHydrated) {
      log('Not hydrated yet, waiting...')
      return
    }

    if (!accessToken) {
      log('No token after hydration, redirecting to /login')
      router.replace('/login')
    } else if (memberships.length === 0) {
      log('No memberships, redirecting to /onboarding')
      router.replace('/onboarding')
    } else {
      log('Auth valid, rendering children')
    }
  }, [isHydrated, accessToken, memberships, router])

  if (!isHydrated) {
    log('Render: waiting for hydration')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!accessToken || memberships.length === 0) {
    log('Render: no token or memberships, showing spinner while redirecting')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return <>{children}</>
}
