/**
 * Analytics & Reports (Admin) - Business Intelligence dashboard
 * KPIs, trends, SLA alerts, error rates, exports
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  CheckCircle,
  FlaskConical,
  DollarSign,
  FileDown,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import {
  useKPIs,
  useTrends,
  useSLAAlerts,
  useErrorRates,
  useExports,
  useSLAComplianceByCustomer,
} from '@/hooks/useAnalytics'
import {
  KPICard,
  FilterBar,
  TrendChart,
  BarChartCard,
  DonutChart,
  SLAHeatmap,
  AlertsPanel,
  ScheduleExportModal,
  ExportList,
} from '@/components/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { subDays, format } from 'date-fns'
import type { AnalyticsFilters } from '@/types/analytics'

const defaultFilters = (): AnalyticsFilters => {
  const end = new Date()
  const start = subDays(end, 30)
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

export function AnalyticsPage() {
  const { hasPermission } = useRBAC()
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters())
  const [alertStatus, setAlertStatus] = useState<string>('open')
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const canExport = hasPermission('analytics', 'execute')

  const { data: kpiData } = useKPIs(filters)
  const { data: turnaroundData, isLoading: turnaroundLoading } = useTrends(
    'turnaround',
    filters,
    'week'
  )
  const { data: revenueData, isLoading: revenueLoading } = useTrends(
    'revenue',
    filters,
    'week'
  )
  const { data: volumeData, isLoading: volumeLoading } = useTrends(
    'testVolume',
    filters,
    'week'
  )
  const { data: alertsData, isLoading: alertsLoading } = useSLAAlerts(
    alertStatus as 'open' | 'acknowledged' | 'resolved' | ''
  )
  const { data: errorData, isLoading: errorLoading } = useErrorRates(filters)
  const { data: exportsData, isLoading: exportsLoading, isError: exportsError, error: exportsErrorObj } = useExports()
  const { data: slaComplianceData, isLoading: slaLoading } = useSLAComplianceByCustomer(filters)

  const summary = kpiData?.summary ?? {
    avgTurnaroundTimeHours: 0,
    onTimeDeliveries: 0,
    totalOnTime: 0,
    testVolumeByType: {},
    totalTestVolume: 0,
    revenueYtd: 0,
    arAging: 0,
    slaCompliancePercent: 0,
    totalSamples: 0,
    totalReports: 0,
  }

  const alerts = alertsData?.data ?? []
  const errorRates = errorData?.data ?? []
  const exportList = exportsData?.data ?? []

  if (!hasPermission('analytics', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view analytics and reports.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics & Reports
          </h1>
          <p className="mt-1 text-muted-foreground">
            Business KPIs, SLA monitoring, and exportable reports
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/analytics/details">Drill Down</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/analytics/exports">Exports</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/analytics/settings">Settings</Link>
            </Button>
          </div>
        </div>
        {canExport && (
          <Button onClick={() => setExportModalOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Avg Turnaround (hrs)"
          value={summary.avgTurnaroundTimeHours.toFixed(1)}
          icon={Clock}
          iconColor="text-primary"
          gradient
        />
        <KPICard
          title="On-Time Deliveries"
          value={`${summary.onTimeDeliveries}/${summary.totalOnTime || 1}`}
          trend={`${summary.slaCompliancePercent}% SLA`}
          trendUp={summary.slaCompliancePercent >= 90}
          icon={CheckCircle}
          iconColor="text-success"
        />
        <KPICard
          title="Test Volume"
          value={summary.totalTestVolume}
          icon={FlaskConical}
          iconColor="text-accent"
        />
        <KPICard
          title="Revenue YTD"
          value={`$${summary.revenueYtd.toLocaleString()}`}
          trend={`AR: $${summary.arAging.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Turnaround Time Trend"
          description="Avg hours from pickup to approval"
          data={turnaroundData?.data ?? []}
          isLoading={turnaroundLoading}
          unit=" hrs"
        />
        <TrendChart
          title="Revenue Trend"
          description="Paid invoices by period"
          data={revenueData?.data ?? []}
          isLoading={revenueLoading}
          unit=""
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="Test Volume Trend"
          description="Lab results by period"
          data={volumeData?.data ?? []}
          isLoading={volumeLoading}
        />
        <BarChartCard
          title="Error Rates by Stage"
          description="Breakdown of errors by workflow stage"
          data={(errorRates ?? []).map((r) => ({ name: r.stage, value: r.count }))}
          isLoading={errorLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          title="Test Volume by Type"
          description="SPC vs Total Coliform distribution"
          data={summary.testVolumeByType ?? {}}
        />
        <SLAHeatmap
          title="SLA Compliance by Customer"
          description="On-time delivery rate per customer"
          data={(slaComplianceData?.data ?? []).slice(0, 8).map((c) => ({
            label: c.customerName,
            compliance: c.compliance,
            total: c.total,
            onTime: c.onTime,
          }))}
          isLoading={slaLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsPanel
          alerts={alerts}
          isLoading={alertsLoading}
          statusFilter={alertStatus}
          onStatusFilter={setAlertStatus}
          maxItems={8}
        />
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Alerts Center
            </CardTitle>
            <CardDescription>
              View and manage all SLA and KPI alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/dashboard/analytics/alerts">
                View All Alerts
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {canExport && (
        <ExportList
          exports={exportList}
          isLoading={exportsLoading}
          error={exportsError ? exportsErrorObj ?? null : null}
        />
      )}

      <ScheduleExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        filters={filters}
      />
    </div>
  )
}
