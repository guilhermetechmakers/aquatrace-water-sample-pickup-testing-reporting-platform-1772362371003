/**
 * Analytics Details - drill-down panels for customers, tests, labs, technicians
 */

import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import {
  useKPIs,
  useTrends,
  useSLAComplianceByCustomer,
  useErrorRates,
} from '@/hooks/useAnalytics'
import {
  FilterBar,
  TrendChart,
  BarChartCard,
  DonutChart,
  SLAHeatmap,
  DataTable,
} from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { subDays, format } from 'date-fns'
import type { AnalyticsFilters } from '@/types/analytics'
import type { ColumnDef } from '@tanstack/react-table'

const defaultFilters = (): AnalyticsFilters => {
  const end = new Date()
  const start = subDays(end, 30)
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

export function AnalyticsDetailsPage() {
  const { hasPermission } = useRBAC()
  const [searchParams] = useSearchParams()
  const drillDown = searchParams.get('drill') ?? 'customers'
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters())

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
  const { data: slaData, isLoading: slaLoading, refetch: refetchSLA } = useSLAComplianceByCustomer(filters)
  const { data: errorData, isLoading: errorLoading } = useErrorRates(filters)

  const slaRows = (slaData?.data ?? []).map((c) => ({
    label: c.customerName,
    compliance: c.compliance,
    total: c.total,
    onTime: c.onTime,
  }))

  const customerColumns: ColumnDef<{ customerName: string; compliance: number; total: number; onTime: number }>[] = [
    { id: 'customerName', accessorKey: 'customerName', header: 'Customer', enableSorting: true },
    { id: 'compliance', accessorKey: 'compliance', header: 'SLA %', enableSorting: true },
    { id: 'onTime', accessorKey: 'onTime', header: 'On Time', enableSorting: true },
    { id: 'total', accessorKey: 'total', header: 'Total', enableSorting: true },
  ]

  const errorColumns: ColumnDef<{ stage: string; count: number; percent: number }>[] = [
    { id: 'stage', accessorKey: 'stage', header: 'Stage', enableSorting: true },
    { id: 'count', accessorKey: 'count', header: 'Errors', enableSorting: true },
    { id: 'percent', accessorKey: 'percent', header: '%', enableSorting: true },
  ]

  if (!hasPermission('analytics', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view analytics details.
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
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/analytics" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Analytics
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight mt-2">
            Analytics Details
          </h1>
          <p className="mt-1 text-muted-foreground">
            Drill-down by customer, test type, lab, or technician
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onFiltersChange={setFilters} />

      <Tabs defaultValue={drillDown} className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="tests">By Test Type</TabsTrigger>
          <TabsTrigger value="errors">Error Breakdown</TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="space-y-6">
          <SLAHeatmap
            title="SLA Compliance by Customer"
            data={slaRows}
            isLoading={slaLoading}
            onEmptyStateAction={refetchSLA}
            onRetry={refetchSLA}
          />
          <DataTable
            title="Customer SLA Details"
            data={slaData?.data ?? []}
            columns={customerColumns}
            isLoading={slaLoading}
            pageSize={15}
          />
        </TabsContent>
        <TabsContent value="tests" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart
              title="Turnaround Time"
              data={turnaroundData?.data ?? []}
              isLoading={turnaroundLoading}
              unit=" hrs"
            />
            <TrendChart
              title="Revenue"
              data={revenueData?.data ?? []}
              isLoading={revenueLoading}
            />
          </div>
          <DonutChart
            title="Test Volume by Type"
            data={kpiData?.summary?.testVolumeByType ?? {}}
          />
        </TabsContent>
        <TabsContent value="errors" className="space-y-6">
          <BarChartCard
            title="Error Rates by Stage"
            data={(errorData?.data ?? []).map((r) => ({ name: r.stage, value: r.count }))}
            isLoading={errorLoading}
          />
          <DataTable
            title="Error Breakdown"
            data={errorData?.data ?? []}
            columns={errorColumns}
            isLoading={errorLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
