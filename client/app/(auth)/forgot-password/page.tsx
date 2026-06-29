'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForgotPassword } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const forgotPassword = useForgotPassword()
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await forgotPassword.mutateAsync({ email })
    router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card border border-border rounded-lg shadow-(--shadow-card) p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a one-time code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          {forgotPassword.error && (
            <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
              {forgotPassword.error.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
            {forgotPassword.isPending ? 'Sending OTP…' : 'Send OTP'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
