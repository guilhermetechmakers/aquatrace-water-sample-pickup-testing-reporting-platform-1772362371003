/**
 * Customer Portal (page_013) - Secure portal for viewing/searching/downloading reports and invoices
 */

import { useState, useMemo, useCallback } from 'react'
import {
  FileText,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePortalReports, usePortalInvoices, useTenantData } from '@/hooks/usePortal'
import { ReportList } from '@/components/portal/report-list'
import { InvoiceList } from '@/components/portal/invoice-list'
import { UserManagementSection } from '@/components/portal/user-management-section'
import { usePortalSupport } from '@/contexts/portal-support-context'
import { logPortalAudit } from '@/api/portal'
import { cn } from '@/lib/utils'

export function CustomerPortalPage() {
  const { data: customerId } = useTenantData()
  const [search, setSearch] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const support = usePortalSupport()

  const reportFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter ?? undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      limit: 20,
    }),
    [search, statusFilter, dateFrom, dateTo, page]
  )

  const invoiceFilters = useMemo(
    () => ({
      search: invoiceSearch.trim() || undefined,
      page: 1,
      limit: 20,
    }),
    [invoiceSearch]
  )

  const { data: reportsData, isLoading, refetch } = usePortalReports(reportFilters)
  const { data: invoicesData, isLoading: invoicesLoading } = usePortalInvoices(invoiceFilters)

  const reports = reportsData?.reports ?? []
  const reportsCount = reportsData?.count ?? 0
  const invoices = invoicesData?.invoices ?? []
  const invoicesCount = invoicesData?.count ?? 0

  const handleViewReport = useCallback(
    (reportId: string) => {
      if (customerId) {
        logPortalAudit(customerId, 'report_viewed', 'report', reportId).catch(() => {})
      }
    },
    [customerId]
  )

  const reportListItems = useMemo(
    () =>
      (reports ?? []).map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        report_id: (r.report_id as string) ?? (r.id as string)?.slice(0, 12),
        customer_id: r.customer_id as string | undefined,
        status: (r.status as string) ?? 'draft',
        created_at: r.created_at as string | undefined,
        pdf_link: (r.pdf_link as string) ?? null,
        pickup: (r.pickup as { location?: string; sampleId?: string }) ?? null,
        version: r.version as number | undefined,
      })),
    [reports]
  )

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View, search, and download your water test reports
          </p>
        </div>
        <div className="flex gap-2">
          {support && (
            <Button
              variant="outline"
              onClick={support.openSupport}
              className="transition-all hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Support
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Recent Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reportsCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Available for download</p>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoicesCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Available for download</p>
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use search and date filters below to find reports
            </p>
          </CardContent>
        </Card>
        <UserManagementSection canManageUsers={true} />
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <div className="relative flex-1 max-w-sm">
                    <Input
                      placeholder="Search by report ID, location, sample ID..."
                      className="pl-4"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Input
                      type="date"
                      placeholder="From"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[140px]"
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[140px]"
                    />
                    {['draft', 'approved', 'distributed'].map((s) => (
                      <Button
                        key={s}
                        variant={statusFilter === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReportList
                reports={reportListItems}
                count={reportsCount}
                isLoading={isLoading}
                page={page}
                limit={20}
                onPageChange={setPage}
                onViewReport={handleViewReport}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="relative max-w-sm">
                <Input
                  placeholder="Search invoices..."
                  className="pl-4"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceList invoices={invoices} isLoading={invoicesLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
