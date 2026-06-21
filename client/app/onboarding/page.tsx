'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { Membership, Role } from '@/shared/types'
import { Button } from '@/components/ui/button'

type CreateBusinessResponse = {
  business: { id: string; tradeName: string }
  membership: { businessId: string; tradeName: string; role: Role }
}

// GST 2-digit state codes for Indian states/UTs
const STATE_CODES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const addMembership = useAuthStore((s) => s.addMembership)

  const [tradeName, setTradeName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await api
        .post('businesses', {
          json: { tradeName, stateCode, invoicePrefix },
          credentials: 'include',
        })
        .json<CreateBusinessResponse>()

      addMembership(data.membership as Membership)
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof HTTPError) {
        const body = await err.response.json<{ error?: string }>().catch((): { error?: string } => ({}))
        setError(body.error ?? 'Failed to create business')
      } else {
        setError('Could not reach the server')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-(--shadow-card) p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Set up your business</h1>
            <p className="text-sm text-muted-foreground">
              This takes 30 seconds. You can update everything later.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="tradeName">
                Business name
              </label>
              <input
                id="tradeName"
                type="text"
                required
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Sharma Traders"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="stateCode">
                State
              </label>
              <select
                id="stateCode"
                required
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select your state</option>
                {STATE_CODES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Used to determine CGST/SGST vs IGST on invoices
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="invoicePrefix">
                Invoice prefix
              </label>
              <input
                id="invoicePrefix"
                type="text"
                required
                maxLength={10}
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="INV"
              />
              <p className="text-xs text-muted-foreground">
                Your invoices will be numbered {invoicePrefix || 'INV'}-001, {invoicePrefix || 'INV'}-002…
              </p>
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating business…' : 'Continue to dashboard'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
