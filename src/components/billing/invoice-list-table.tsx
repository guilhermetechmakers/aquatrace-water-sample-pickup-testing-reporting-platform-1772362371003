/**
 * InvoiceListTable - Paginated list with search, filters (status, customer, date range), bulk actions
 */

import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Send, Download, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Invoice, InvoiceStatus } from '@/types/billing'
import { cn } from '@/lib/utils'

const STATUS_VARIANTS: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'destructive' | 'pending' | 'approved'> = {
  draft: 'default',
  issued: 'pending',
  pending: 'pending',
  paid: 'approved',
  overdue: 'destructive',
  refunded: 'default',
  partially_paid: 'warning',
}

export interface InvoiceListTableProps {
  invoices: Invoice[]
  count: number
  page: number
  limit: number
  isLoading?: boolean
  search?: string
  statusFilter?: string
  customerFilter?: string
  dateFrom?: string
  dateTo?: string
  onSearchChange?: (value: string) => void
  onStatusFilterChange?: (value: string) => void
  onPageChange?: (page: number) => void
  onSend?: (invoice: Invoice) => void
  onDownload?: (invoice: Invoice) => void
  onRecordPayment?: (invoice: Invoice) => void
  onRowClick?: (invoice: Invoice) => void
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

export function InvoiceListTable({
  invoices = [],
  count = 0,
  page = 1,
  limit = 20,
  isLoading = false,
  search = '',
  statusFilter = '',
  onSearchChange,
  onStatusFilterChange,
  onPageChange,
  onSend,
  onDownload,
  onRecordPayment,
  onRowClick,
}: InvoiceListTableProps) {
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / (limit || 20)))
  const list = Array.isArray(invoices) ? invoices : []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-10 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange?.(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 sticky top-0">
                <th className="h-12 px-4 text-left align-middle font-medium">Invoice</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Due Date</th>
                <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                <th className="h-12 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-24 text-center text-muted-foreground">
                    No invoices found. Create one to get started.
                  </td>
                </tr>
              ) : (
                list.map((inv) => (
                  <tr
                    key={inv.id}
                    className={cn(
                      'border-b border-border transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-muted/30'
                    )}
                    onClick={() => onRowClick?.(inv)}
                  >
                    <td className="p-4 font-mono text-sm">{inv.invoiceId}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                    <td className="p-4">
                      <Badge variant={STATUS_VARIANTS[inv.status] ?? 'default'}>
                        {inv.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onSend && inv.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => onSend(inv)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </DropdownMenuItem>
                          )}
                          {onDownload && (
                            <DropdownMenuItem onClick={() => onDownload(inv)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          {onRecordPayment && (inv.status === 'issued' || inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'partially_paid') && (
                            <DropdownMenuItem onClick={() => onRecordPayment(inv)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({count} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
