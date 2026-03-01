/**
 * Alerts Center - full page listing of SLA and KPI alerts
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import { useSLAAlerts } from '@/hooks/useAnalytics'
import { AlertsPanel, DrillDownModal } from '@/components/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SLAAlert } from '@/types/analytics'

export function AlertsCenterPage() {
  const { hasPermission } = useRBAC()
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [selectedAlert, setSelectedAlert] = useState<SLAAlert | null>(null)

  const { data: alertsData, isLoading } = useSLAAlerts(
    statusFilter as 'open' | 'acknowledged' | 'resolved' | ''
  )
  const alerts = alertsData?.data ?? []

  if (!hasPermission('analytics', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view alerts.
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
            Alerts Center
          </h1>
          <p className="mt-1 text-muted-foreground">
            SLA breach alerts and KPI threshold notifications
          </p>
        </div>
      </div>

      <AlertsPanel
        alerts={alerts}
        isLoading={isLoading}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        maxItems={50}
      />

      <DrillDownModal
        open={selectedAlert != null}
        onOpenChange={(o) => !o && setSelectedAlert(null)}
        title={selectedAlert?.workflowStage ?? 'Alert Details'}
        description={selectedAlert?.customerName ?? undefined}
        alert={selectedAlert ?? undefined}
      />
    </div>
  )
}
