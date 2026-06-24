'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const accessToken = useAuthStore((s) => s.accessToken)
  const memberships = useAuthStore((s) => s.memberships)

  useEffect(() => {
    if (!isHydrated) return

    if (!accessToken) {
      router.replace('/login')
    } else if (memberships.length === 0) {
      router.replace('/onboarding')
    }
  }, [isHydrated, accessToken, memberships, router])

  if (!isHydrated || !accessToken || memberships.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return <>{children}</>
}
