/**
 * Analytics Settings - ETL status, data warehouse connections, user access
 */

import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Settings2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function AnalyticsSettingsPage() {
  const { hasPermission } = useRBAC()

  if (!hasPermission('analytics', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You do not have permission to view analytics settings.
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
            Analytics Settings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Data warehouse connections, ETL job status, user access
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Data Warehouse</CardTitle>
            </div>
            <CardDescription>
              Supabase PostgreSQL analytic store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connection</span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">KPI Aggregates</span>
              <span>Enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle>ETL Jobs</CardTitle>
            </div>
            <CardDescription>
              Micro-batches and daily aggregates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SLA Alerts</span>
              <Badge variant="outline">Near real-time</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dashboard KPIs</span>
              <Badge variant="outline">Hourly</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-card-hover md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Role-Based Access</CardTitle>
            </div>
            <CardDescription>
              Analytics permissions by role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Technician</p>
                <p className="text-sm text-muted-foreground">Minimal analytics access</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">Lab Tech</p>
                <p className="text-sm text-muted-foreground">Lab-related KPIs</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">Lab Manager</p>
                <p className="text-sm text-muted-foreground">Approvals, exports</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">Full access</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium">Viewer</p>
                <p className="text-sm text-muted-foreground">Read-only analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
