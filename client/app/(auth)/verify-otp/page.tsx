'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVerifyOtp } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function VerifyOtpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''
  const verifyOtp = useVerifyOtp()
  const [otp, setOtp] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = await verifyOtp.mutateAsync({ phone, otp })
    router.push(`/reset-password?token=${encodeURIComponent(data.resetToken)}`)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card border border-border rounded-lg shadow-(--shadow-card) p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Enter OTP</h1>
          <p className="text-sm text-muted-foreground">
            A 6-digit code was sent to{' '}
            <span className="font-medium text-foreground">{phone}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="otp">
              One-time code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="123456"
            />
          </div>

          {verifyOtp.error && (
            <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
              {verifyOtp.error.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={verifyOtp.isPending}>
            {verifyOtp.isPending ? 'Verifying…' : 'Verify code'}
          </Button>
        </form>
      </div>
    </div>
  )
}
