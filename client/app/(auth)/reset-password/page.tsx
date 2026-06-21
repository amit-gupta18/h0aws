'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResetPassword } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useSearchParams()
  const resetToken = params.get('token') ?? ''
  const resetPassword = useResetPassword()
  const [newPassword, setNewPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await resetPassword.mutateAsync({ resetToken, newPassword })
    router.push('/login')
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card border border-border rounded-lg shadow-(--shadow-card) p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Min. 8 characters"
            />
          </div>

          {resetPassword.error && (
            <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
              {resetPassword.error.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
