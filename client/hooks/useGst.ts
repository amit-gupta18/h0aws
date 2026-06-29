'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

export type GstExportType = 'gstr1_b2b' | 'gstr1_hsn_b2b' | 'gstr1_hsn_b2c' | 'gstr2_inward'

export type GstSummary = {
  period: { month: number; year: number; label: string }
  b2b: {
    invoiceNumber: string
    invoiceDate: string
    customerName: string
    customerGSTIN: string
    placeOfSupply: string | null
    taxableAmount: number
    cgst: number
    sgst: number
    igst: number
    total: number
  }[]
  b2c: {
    taxableAmount: number
    cgst: number
    sgst: number
    igst: number
    total: number
    invoiceCount: number
    byRate: {
      gstRate: number
      invoiceCount: number
      taxableAmount: number
      cgst: number
      sgst: number
      igst: number
      total: number
    }[]
  }
  b2cLarge: {
    invoiceNumber: string
    invoiceDate: string
    customerName: string
    total: number
  }[]
  hsn: {
    b2b: HsnRow[]
    b2c: HsnRow[]
  }
  documents: {
    issuedInvoices: number
    cancelledInvoices: number
    note: string
  }
  inward: {
    b2b: InwardRow[]
    unregistered: Omit<InwardRow, 'supplierGSTIN'>[]
  }
  inwardDisclaimer: string
  liability: {
    outputGST: number
    inputGST: number
    netPayable: number
    disclaimer: string
    filingDeadline: string
  }
  counts: {
    b2bInvoices: number
    b2cInvoiceGroups: number
    inwardB2bBills: number
  }
  aiInsight: string
}

type HsnRow = {
  hsnCode: string
  unit: string
  totalQuantity: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
}

type InwardRow = {
  billNumber: string
  billDate: string
  supplierName: string
  supplierGSTIN: string
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof HTTPError) {
      const body = await err.response.json<{ error?: string }>().catch((): { error?: string } => ({}))
      throw new Error(body.error ?? 'Something went wrong')
    }
    throw new Error('Could not reach the server')
  }
}

export function useGstSummary(month: number, year: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['gst-summary', activeBusinessId, month, year],
    queryFn: () =>
      apiCall(() =>
        api.get(`gst/summary?month=${month}&year=${year}`).json<GstSummary>()
      ),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export async function downloadGstExport(month: number, year: number, type: GstExportType) {
  const { accessToken, activeBusinessId } = useAuthStore.getState()
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
  const url = `${base}/gst/export?month=${month}&year=${year}&type=${type}`

  const res = await fetch(url, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { 'X-Business-Id': activeBusinessId } : {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Export failed')
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `${type}_${year}-${String(month).padStart(2, '0')}.csv`

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function useInvalidateGst() {
  const queryClient = useQueryClient()
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return () => {
    queryClient.invalidateQueries({ queryKey: ['gst-summary', activeBusinessId] })
  }
}
