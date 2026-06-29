'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useInvoice, useCancelInvoice, useInvoicePdf } from '@/hooks/useInvoices'
import { useActiveRole } from '@/store/authStore'
import { Button, buttonVariants } from '@/components/ui/button'
import { getTemplate, type InvoiceTemplateData } from '@/components/templates'
import Link from 'next/link'
import { ArrowLeft, Download, XCircle, Pencil } from 'lucide-react'

const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFViewer),
  { ssr: false }
)

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: invoice, isLoading, error } = useInvoice(id)
  const cancelInvoice = useCancelInvoice()
  const role = useActiveRole()
  const canCancel = role === 'OWNER' || role === 'ACCOUNTANT'

  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [downloadPdf, setDownloadPdf] = useState(false)

  const { data: pdfData } = useInvoicePdf(id, downloadPdf)

  const handleDownload = () => {
    setDownloadPdf(true)
  }

  if (pdfData?.url && downloadPdf) {
    window.open(pdfData.url, '_blank')
    setDownloadPdf(false)
  }

  const handleCancel = async () => {
    await cancelInvoice.mutateAsync(id)
    setShowConfirmCancel(false)
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading invoice...</div>
  }

  if (error) {
    return <div className="text-destructive">{error.message}</div>
  }

  if (!invoice) {
    return <div className="text-muted-foreground">Invoice not found</div>
  }

  const templateData: InvoiceTemplateData = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    documentType: invoice.documentType,
    transactionType: invoice.transactionType,
    paymentMode: invoice.paymentMode,
    notes: invoice.notes,
    business: invoice.business,
    customer: invoice.customer,
    items: invoice.items.map((item) => ({
      nameSnapshot: item.nameSnapshot,
      hsnSnapshot: item.hsnSnapshot,
      unitSnapshot: item.unitSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      gstRate: item.gstRate,
      taxableValue: item.taxableValue,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      lineTotal: item.lineTotal,
    })),
    subtotal: invoice.subtotal,
    discount: invoice.discountTotal,
    taxableAmount: invoice.taxableAmount,
    cgstTotal: invoice.cgstTotal,
    sgstTotal: invoice.sgstTotal,
    igstTotal: invoice.igstTotal,
    grandTotal: invoice.grandTotal,
  }

  const Template = getTemplate(invoice.templateId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground truncate text-sm">
              {invoice.invoiceDate} | {invoice.customer?.name ?? 'Walk-in Customer'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              invoice.status === 'ISSUED'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {invoice.status}
          </span>

          {invoice.status === 'ISSUED' && (
            <>
              {canCancel && (
                <Link
                  href={`/dashboard/sales/invoices/${id}/edit`}
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full shrink-0 sm:w-auto',
                  })}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Invoice
                </Link>
              )}

              <Button variant="outline" onClick={handleDownload} className="w-full shrink-0 sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>

              {canCancel && (
                <Button variant="destructive" onClick={() => setShowConfirmCancel(true)} className="w-full shrink-0 sm:w-auto">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {showConfirmCancel && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="mb-3 text-sm">
            Are you sure you want to cancel this invoice? This action cannot be undone.
            The invoice number will not be reused (GST compliance).
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={cancelInvoice.isPending}
            >
              {cancelInvoice.isPending ? 'Cancelling...' : 'Yes, Cancel Invoice'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfirmCancel(false)}>
              No, Keep It
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Invoice Details</h2>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <dt className="text-muted-foreground">Invoice Number</dt>
              <dd className="font-medium">{invoice.invoiceNumber}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd>{invoice.invoiceDate}</dd>
              <dt className="text-muted-foreground">Document Type</dt>
              <dd>{invoice.documentType.replace('_', ' ')}</dd>
              <dt className="text-muted-foreground">Transaction Type</dt>
              <dd>{invoice.transactionType.replace('_', '-')}</dd>
              <dt className="text-muted-foreground">Payment Mode</dt>
              <dd>{invoice.paymentMode}</dd>
            </dl>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Customer</h2>
            {invoice.customer ? (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{invoice.customer.name}</dd>
                {invoice.customer.gstin && (
                  <>
                    <dt className="text-muted-foreground">GSTIN</dt>
                    <dd>{invoice.customer.gstin}</dd>
                  </>
                )}
                {invoice.customer.billingAddress && (
                  <>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd>{invoice.customer.billingAddress}</dd>
                  </>
                )}
                {invoice.customer.stateCode && (
                  <>
                    <dt className="text-muted-foreground">State</dt>
                    <dd>{invoice.customer.stateCode}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">Walk-in Customer</p>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">
                        <div className="font-medium">{item.nameSnapshot}</div>
                        {item.hsnSnapshot && (
                          <div className="text-muted-foreground text-xs">HSN: {item.hsnSnapshot}</div>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {item.quantity} {item.unitSnapshot}
                      </td>
                      <td className="py-2 text-right">{item.unitPrice.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-medium">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-mono">{invoice.subtotal.toFixed(2)}</dd>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between">
                  <dt>Discount</dt>
                  <dd className="font-mono">-{invoice.discountTotal.toFixed(2)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Taxable Amount</dt>
                <dd className="font-mono">{invoice.taxableAmount.toFixed(2)}</dd>
              </div>
              {invoice.transactionType === 'INTER_STATE' ? (
                <div className="flex justify-between">
                  <dt>IGST</dt>
                  <dd className="font-mono">{invoice.igstTotal.toFixed(2)}</dd>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt>CGST</dt>
                    <dd className="font-mono">{invoice.cgstTotal.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>SGST</dt>
                    <dd className="font-mono">{invoice.sgstTotal.toFixed(2)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Grand Total</dt>
                <dd className="font-mono">
                  {invoice.grandTotal.toLocaleString('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {invoice.notes && (
            <div className="rounded-lg border p-4">
              <h2 className="mb-2 font-medium">Notes</h2>
              <p className="text-muted-foreground text-sm">{invoice.notes}</p>
            </div>
          )}
        </div>

        <div>
          <div className="lg:sticky lg:top-6">
            <h2 className="mb-3 font-medium">Preview</h2>
            <div className="h-[min(70vh,800px)] overflow-hidden rounded-lg border">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <Template data={templateData} />
              </PDFViewer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
