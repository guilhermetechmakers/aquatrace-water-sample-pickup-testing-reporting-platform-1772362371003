/**
 * Invoice Detail Page - View invoice with line items, payments, actions (send, download, record payment)
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  Download,
  DollarSign,
  FileText,
  Calendar,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RecordPaymentDialog,
} from '@/components/billing'
import { useInvoice, useSendInvoice, useRecordPayment, useGenerateInvoicePdf } from '@/hooks/useBilling'
import { toast } from 'sonner'
import type { InvoiceStatus } from '@/types/billing'

const STATUS_VARIANTS: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'destructive' | 'pending' | 'approved'> = {
  draft: 'default',
  issued: 'pending',
  pending: 'pending',
  paid: 'approved',
  overdue: 'destructive',
  refunded: 'default',
  partially_paid: 'warning',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useInvoice(id ?? null)
  const sendInvoice = useSendInvoice()
  const recordPayment = useRecordPayment()
  const generatePdf = useGenerateInvoicePdf()
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  const inv = invoice ?? null
  const items = Array.isArray(inv?.items) ? inv.items : []
  const payments = Array.isArray(inv?.payments) ? inv.payments : []
  const paidTotal = payments.reduce((sum, p) => sum + (p?.amount ?? 0), 0)
  const balanceDue = (inv?.totalAmount ?? 0) - paidTotal

  const handleSend = () => {
    if (!inv?.id) return
    sendInvoice.mutate(inv.id)
  }

  const handleDownload = () => {
    if (!inv?.id) return
    generatePdf.mutate(inv.id, {
      onSuccess: (result) => {
        if (!result) return
        if ('blob' in result && result.blob) {
          const url = URL.createObjectURL(result.blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.filename ?? `invoice-${inv.invoiceId}.pdf`
          a.click()
          URL.revokeObjectURL(url)
          toast.success('PDF downloaded')
        } else if ('html' in result && result.html) {
          const w = window.open('', '_blank')
          if (w) {
            w.document.write(result.html)
            w.document.close()
            w.print()
            w.close()
          }
          toast.success('Opened for print')
        }
      },
    })
  }

  const handleRecordPayment = (invoiceId: string, amount: number, method?: import('@/types/billing').PaymentMethod) => {
    recordPayment.mutate({ invoiceId, amount, method }, { onSuccess: () => setShowPaymentDialog(false) })
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!inv) {
    return (
      <div className="space-y-8 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/dashboard/invoicing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Invoice not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/invoicing')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">{inv.invoiceId}</h1>
            <p className="text-muted-foreground mt-1">
              <Calendar className="h-4 w-4 inline mr-1" />
              Due {formatDate(inv.dueDate)}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[inv.status] ?? 'default'}>
            {inv.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.status !== 'paid' && inv.status !== 'refunded' && (
            <Button variant="outline" size="sm" onClick={handleSend} disabled={sendInvoice.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {sendInvoice.isPending ? 'Sending...' : 'Send'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={generatePdf.isPending}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {(inv.status === 'issued' || inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
            <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Description</th>
                      <th className="h-10 px-4 text-right font-medium w-20">Qty</th>
                      <th className="h-10 px-4 text-right font-medium w-28">Unit Price</th>
                      <th className="h-10 px-4 text-right font-medium w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-16 text-center text-muted-foreground">
                          No line items
                        </td>
                      </tr>
                    ) : (
                      items.map((it, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="p-4 font-medium">{it?.description ?? '—'}</td>
                          <td className="p-4 text-right">{it?.quantity ?? 0}</td>
                          <td className="p-4 text-right text-muted-foreground">
                            {formatCurrency(it?.unitPrice ?? 0)}
                          </td>
                          <td className="p-4 text-right font-medium">
                            {formatCurrency(it?.lineTotal ?? 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-4 p-4 border-t border-border">
                {inv.taxes > 0 && (
                  <span className="text-muted-foreground">Taxes: {formatCurrency(inv.taxes)}</span>
                )}
                {inv.discounts > 0 && (
                  <span className="text-muted-foreground">Discounts: -{formatCurrency(inv.discounts)}</span>
                )}
                <span className="text-lg font-bold">Total: {formatCurrency(inv.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payments
              </CardTitle>
              <CardDescription>
                Balance due: {formatCurrency(balanceDue)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet</p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span>{formatCurrency(p.amount ?? 0)}</span>
                      <span className="text-muted-foreground">{formatDate(p.paidAt ?? '')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordPaymentDialog
        invoice={inv}
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onRecord={handleRecordPayment}
        isLoading={recordPayment.isPending}
      />
    </div>
  )
}

export default InvoiceDetailPage
