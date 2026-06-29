'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { HTTPError } from 'ky'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { CreatePurchaseInput } from '@/hooks/usePurchases'

export type CompositionAdvisory = {
  eligible: boolean
  currentGSTPaid: number
  compositionTax: number
  potentialSavings: number
  annualTurnover: number
  aiAdvice: string
  fyStartYear: number
  fyLabel: string
  schemeDetails: {
    taxRate: string
    filingFrequency: string
    restrictions: string[]
  }
}

export type ReconciliationDemo = {
  period: string
  matched: number
  mismatched: number
  mismatches: {
    supplierName: string
    supplierGSTIN: string
    yourClaimedITC: number
    supplierFiledAmount: number
    difference: number
    risk: 'none' | 'high' | 'critical'
    action: string | null
  }[]
  totalITCAtRisk: number
  aiSummary: string
  disclaimer: string
}

export type OcrResult = {
  extracted: {
    supplierGSTIN: string | null
    supplierName: string | null
    invoiceNumber: string | null
    invoiceDate: string | null
    hsnCode: string | null
    taxableAmount: number | null
    cgst: number | null
    sgst: number | null
    igst: number | null
    totalAmount: number | null
  }
  purchaseInput: CreatePurchaseInput
  confidence: 'high' | 'medium' | 'low'
  savedAs?: string
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

export function currentFyStartYear(date = new Date()) {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return month >= 4 ? year : year - 1
}

export function useCompositionAdvisory(fyStartYear?: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)
  const fy = fyStartYear ?? currentFyStartYear()

  return useQuery({
    queryKey: ['gst-composition', activeBusinessId, fy],
    queryFn: () =>
      apiCall(() =>
        api.get(`gst/advisory/composition?fyStartYear=${fy}`).json<CompositionAdvisory>()
      ),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export function useReconciliationDemo(month: number, year: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const activeBusinessId = useAuthStore((s) => s.activeBusinessId)

  return useQuery({
    queryKey: ['gst-reconciliation', activeBusinessId, month, year],
    queryFn: () =>
      apiCall(() =>
        api
          .get(`gst/reconciliation/demo?month=${month}&year=${year}`)
          .json<ReconciliationDemo>()
      ),
    enabled: !!accessToken && !!activeBusinessId,
  })
}

export async function uploadPurchaseOcr(file: File, save = false): Promise<OcrResult> {
  const { accessToken, activeBusinessId } = useAuthStore.getState()
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
  const form = new FormData()
  form.append('image', file)

  const url = `${base}/gst/purchase/ocr${save ? '?save=true' : ''}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { 'X-Business-Id': activeBusinessId } : {}),
    },
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'OCR failed')
  }

  return res.json() as Promise<OcrResult>
}

export function usePurchaseOcr() {
  return useMutation({
    mutationFn: ({ file, save }: { file: File; save?: boolean }) =>
      uploadPurchaseOcr(file, save ?? false),
  })
}

export async function downloadItrPackage(fyStartYear?: number) {
  const { accessToken, activeBusinessId } = useAuthStore.getState()
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
  const fy = fyStartYear ?? currentFyStartYear()
  const url = `${base}/gst/itr-package?fyStartYear=${fy}`

  const res = await fetch(url, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(activeBusinessId ? { 'X-Business-Id': activeBusinessId } : {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Download failed')
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  triggerDownload(blob, match?.[1] ?? `itr-package_FY_${fy}.pdf`)
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
