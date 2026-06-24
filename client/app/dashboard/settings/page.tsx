'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useBusiness, useUpdateBusiness } from '@/hooks/useBusinesses'
import { Button } from '@/components/ui/button'
import { StateSelect } from '@/components/StateSelect'

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'

export default function SettingsPage() {
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const { data: business, isLoading } = useBusiness(activeBusinessId)
  const updateBusiness = useUpdateBusiness()

  const [formData, setFormData] = useState({
    tradeName: '',
    legalName: '',
    gstin: '',
    gstinType: 'UNREGISTERED' as 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED',
    address: '',
    stateCode: '',
    phone: '',
    invoicePrefix: '',
  })

  useEffect(() => {
    if (business) {
      setFormData({
        tradeName: business.tradeName,
        legalName: business.legalName ?? '',
        gstin: business.gstin ?? '',
        gstinType: business.gstinType,
        address: business.address ?? '',
        stateCode: business.stateCode,
        phone: business.phone ?? '',
        invoicePrefix: business.invoicePrefix,
      })
    }
  }, [business])

  const isOwner = business?.role === 'OWNER'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeBusinessId) return

    updateBusiness.mutate({
      id: activeBusinessId,
      data: {
        tradeName: formData.tradeName,
        legalName: formData.legalName || null,
        gstin: formData.gstin || null,
        gstinType: formData.gstinType,
        address: formData.address || null,
        stateCode: formData.stateCode,
        phone: formData.phone || null,
        invoicePrefix: formData.invoicePrefix,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your business settings</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your business settings</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">No business selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your business settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">
            Business Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="tradeName">
                Trade Name <span className="text-danger">*</span>
              </label>
              <input
                id="tradeName"
                type="text"
                required
                disabled={!isOwner}
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Your business name"
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
                disabled={!isOwner}
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={!isOwner}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                onValueChange={(stateCode) => setFormData({ ...formData, stateCode })}
                placeholder="Select state"
                disabled={!isOwner}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                disabled={!isOwner}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                placeholder="Business address"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">
            GST Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="gstin">
                GSTIN
              </label>
              <input
                id="gstin"
                type="text"
                disabled={!isOwner}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                placeholder="22AAAAA0000A1Z5"
              />
              <p className="text-xs text-muted-foreground">15-character GST Identification Number</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="gstinType">
                GST Registration Type
              </label>
              <select
                id="gstinType"
                disabled={!isOwner}
                value={formData.gstinType}
                onChange={(e) => setFormData({ ...formData, gstinType: e.target.value as 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' })}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="UNREGISTERED">Unregistered</option>
                <option value="REGULAR">Regular</option>
                <option value="COMPOSITION">Composition</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-5">
          <h2 className="text-sm font-semibold text-foreground border-b border-border pb-3">
            Invoice Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="invoicePrefix">
                Invoice Prefix <span className="text-danger">*</span>
              </label>
              <input
                id="invoicePrefix"
                type="text"
                required
                disabled={!isOwner}
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                maxLength={10}
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                placeholder="INV"
              />
              <p className="text-xs text-muted-foreground">Invoices will be numbered as {formData.invoicePrefix || 'INV'}0001, {formData.invoicePrefix || 'INV'}0002, etc.</p>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex justify-end gap-3">
            {updateBusiness.isSuccess && (
              <p className="text-sm text-success self-center">Settings saved successfully!</p>
            )}
            {updateBusiness.error && (
              <p className="text-sm text-danger self-center">{updateBusiness.error.message}</p>
            )}
            <Button type="submit" disabled={updateBusiness.isPending}>
              {updateBusiness.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}

        {!isOwner && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Only business owners can edit settings.
          </p>
        )}
      </form>
    </div>
  )
}
