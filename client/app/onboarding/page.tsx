'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateBusiness } from '@/hooks/useBusinesses'
import { Button } from '@/components/ui/button'

const STATE_CODES = [
  { code: '37', name: 'Andhra Pradesh' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '18', name: 'Assam' },
  { code: '10', name: 'Bihar' },
  { code: '04', name: 'Chandigarh' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '07', name: 'Delhi' },
  { code: '30', name: 'Goa' },
  { code: '24', name: 'Gujarat' },
  { code: '06', name: 'Haryana' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '20', name: 'Jharkhand' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '27', name: 'Maharashtra' },
  { code: '14', name: 'Manipur' },
  { code: '17', name: 'Meghalaya' },
  { code: '15', name: 'Mizoram' },
  { code: '13', name: 'Nagaland' },
  { code: '21', name: 'Odisha' },
  { code: '03', name: 'Punjab' },
  { code: '08', name: 'Rajasthan' },
  { code: '11', name: 'Sikkim' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '16', name: 'Tripura' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '19', name: 'West Bengal' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const createBusiness = useCreateBusiness()

  const [tradeName, setTradeName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('INV')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createBusiness.mutateAsync({ tradeName, stateCode, invoicePrefix })
    router.push('/dashboard')
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

            {createBusiness.error && (
              <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {createBusiness.error.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={createBusiness.isPending}>
              {createBusiness.isPending ? 'Creating business…' : 'Continue to dashboard'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
