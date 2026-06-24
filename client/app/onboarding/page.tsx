'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateBusiness } from '@/hooks/useBusinesses'
import { Button } from '@/components/ui/button'
import { StateSelect } from '@/components/StateSelect'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export default function OnboardingPage() {
  const router = useRouter()
  const createBusiness = useCreateBusiness()

  const [formData, setFormData] = useState({
    tradeName: '',
    legalName: '',
    phone: '',
    stateCode: '',
    address: '',
    gstin: '',
    gstinType: 'UNREGISTERED' as 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED',
    invoicePrefix: 'INV',
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  function updateField<K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setValidationError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.stateCode) {
      setValidationError('Please select a state.')
      return
    }

    if (formData.gstin && formData.gstin.length !== 15) {
      setValidationError('GSTIN must be exactly 15 characters.')
      return
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      setValidationError('Phone must be a valid 10-digit Indian mobile number.')
      return
    }

    await createBusiness.mutateAsync({
      tradeName: formData.tradeName,
      stateCode: formData.stateCode,
      invoicePrefix: formData.invoicePrefix,
      legalName: formData.legalName || undefined,
      gstin: formData.gstin || undefined,
      gstinType: formData.gstinType,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
    })

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="bg-card border border-border rounded-lg shadow-(--shadow-card) p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Set up your business</h1>
            <p className="text-sm text-muted-foreground">
              Add your business and GST details so invoices are configured correctly from day one.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                Business Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="tradeName">
                    Trade Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="tradeName"
                    type="text"
                    required
                    value={formData.tradeName}
                    onChange={(e) => updateField('tradeName', e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Sharma Traders"
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears on your invoice as the business name.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="legalName">
                    Legal Name
                  </label>
                  <input
                    id="legalName"
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => updateField('legalName', e.target.value)}
                    className={inputClass}
                    placeholder="Registered legal name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Also printed on invoices when provided.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, ''))}
                    className={inputClass}
                    placeholder="9876543210"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="stateCode">
                    State <span className="text-danger">*</span>
                  </label>
                  <StateSelect
                    id="stateCode"
                    value={formData.stateCode}
                    onValueChange={(stateCode) => updateField('stateCode', stateCode)}
                    placeholder="Select your state"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to determine CGST/SGST vs IGST on invoices
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Business address"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                GST Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="gstin">
                    GSTIN
                  </label>
                  <input
                    id="gstin"
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                    className={`${inputClass} font-mono`}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank if not registered under GST
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="gstinType">
                    GST Registration Type
                  </label>
                  <select
                    id="gstinType"
                    value={formData.gstinType}
                    onChange={(e) =>
                      updateField(
                        'gstinType',
                        e.target.value as 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED'
                      )
                    }
                    className={inputClass}
                  >
                    <option value="UNREGISTERED">Unregistered</option>
                    <option value="REGULAR">Regular</option>
                    <option value="COMPOSITION">Composition</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                Invoice Settings
              </h2>

              <div className="space-y-1.5 max-w-sm">
                <label className="text-sm font-medium text-foreground" htmlFor="invoicePrefix">
                  Invoice Prefix <span className="text-danger">*</span>
                </label>
                <input
                  id="invoicePrefix"
                  type="text"
                  required
                  maxLength={10}
                  value={formData.invoicePrefix}
                  onChange={(e) => updateField('invoicePrefix', e.target.value.toUpperCase())}
                  className={`${inputClass} font-mono`}
                  placeholder="INV"
                />
                <p className="text-xs text-muted-foreground">
                  Invoices will be numbered {formData.invoicePrefix || 'INV'}0001,{' '}
                  {formData.invoicePrefix || 'INV'}0002, etc.
                </p>
              </div>
            </section>

            {(validationError || createBusiness.error) && (
              <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-md px-3 py-2">
                {validationError ?? createBusiness.error?.message}
              </p>
            )}

            <Button type="submit" className="w-full sm:w-auto" disabled={createBusiness.isPending}>
              {createBusiness.isPending ? 'Creating business…' : 'Continue to dashboard'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
