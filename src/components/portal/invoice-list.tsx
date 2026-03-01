/**
 * InvoiceList - Data grid for invoices with actions
 */

import { FileText, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShareLinkDialog } from './share-link-dialog'
import { format } from 'date-fns'
import { useState } from 'react'
import type { PortalInvoice } from '@/types/portal'

type InvoiceRow = Partial<PortalInvoice> & { id: string; invoiceNumber?: string; invoiceId?: string; dueDate?: string; date?: string; amount?: number; status?: string; pdfPath?: string | null; pdfLink?: string | null }

export interface InvoiceListProps {
  invoices: InvoiceRow[]
  isLoading?: boolean
  /** Called when user views/downloads invoice (for audit logging) */
  onViewInvoice?: (invoiceId: string) => void
}

export function InvoiceList({ invoices = [], isLoading = false, onViewInvoice }: InvoiceListProps) {
  const [shareTarget, setShareTarget] = useState<{ type: 'report' | 'invoice'; id: string } | null>(null)
  const safeInvoices = Array.isArray(invoices) ? invoices : []

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">Invoice</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Due Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b">
                  <td className="p-4"><Skeleton className="h-5 w-28" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                  <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                  <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (safeInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No invoices available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your invoices will appear here when they are generated.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Invoices list">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium">Invoice</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Amount</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Due Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="p-4 font-mono text-sm">{inv.invoiceNumber ?? inv.invoiceId ?? inv.id.slice(0, 12)}</td>
                  <td className="p-4">
                    ${typeof inv.amount === 'number' ? inv.amount.toFixed(2) : '0.00'}
                  </td>
                  <td className="p-4 text-sm">
                    {inv.dueDate ?? inv.date ? format(new Date(inv.dueDate ?? inv.date ?? ''), 'PP') : '—'}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        inv.status === 'paid' ? 'approved' : inv.status === 'overdue' ? 'destructive' : 'pending'
                      }
                    >
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        disabled={!inv.pdfLink && !inv.pdfPath}
                        onClick={() => {
                          if (inv.pdfLink ?? inv.pdfPath) {
                            onViewInvoice?.(inv.id)
                            window.open(inv.pdfLink ?? inv.pdfPath ?? '#', '_blank')
                          }
                        }}
                        aria-label="Download invoice"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setShareTarget({ type: 'invoice', id: inv.id })}
                        aria-label="Share link"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {shareTarget && (
        <ShareLinkDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          targetType={shareTarget.type}
          targetId={shareTarget.id}
        />
      )}
    </>
  )
}
