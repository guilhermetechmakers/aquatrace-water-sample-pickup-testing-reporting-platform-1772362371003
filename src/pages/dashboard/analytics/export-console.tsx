/**
 * Export Console - configure export jobs, delivery methods, schedules
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import { useExports } from '@/hooks/useAnalytics'
import { ExportList, ScheduleExportModal } from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function ExportConsolePage() {
  const { hasPermission } = useRBAC()
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [filters] = useState<AnalyticsFilters>(defaultFilters())

  const { data: exportsData, isLoading, isError, error } = useExports()
  const exportList = exportsData?.data ?? []

  const canExport = hasPermission('analytics', 'execute')

  if (!hasPermission('analytics', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view exports.
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
            Export Console
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configure export jobs, delivery methods, and schedules
          </p>
        </div>
        {canExport && (
          <Button onClick={() => setExportModalOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            New Export
          </Button>
        )}
      </div>

      <ExportList exports={exportList} isLoading={isLoading} error={isError ? error ?? null : null} />

      <ScheduleExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        filters={filters}
      />
    </div>
  )
}
