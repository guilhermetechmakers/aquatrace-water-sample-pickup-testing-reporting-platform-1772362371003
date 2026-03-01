/**
 * Alerts & Analytics Dashboard (page_018)
 * Delivery statuses, retry queues, dead-letter, metrics
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
  Smartphone,
  Radio,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRBAC } from '@/hooks/useRBAC'
import { useAudit } from '@/hooks/useNotifications'
import { format } from 'date-fns'
import type { Notification } from '@/types/notifications'

const EVENT_TYPES = [
  'pickup_assigned',
  'pickup_completed',
  'lab_results_ready',
  'approval_needed',
  'invoice_created',
  'invoice_paid',
  'sla_breach',
] as const

export function AlertsDashboardPage() {
  const { hasPermission } = useRBAC()
  const [eventFilter, setEventFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const { data, isLoading } = useAudit({
    event_type: eventFilter || undefined,
    status: statusFilter || undefined,
  })

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view alerts and analytics.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const metrics = data?.metrics ?? {
    totalSent: 0,
    totalFailed: 0,
    totalQueued: 0,
    deadLetterCount: 0,
    byEventType: {},
    byChannel: {},
  }
  const notifications = data?.notifications ?? []

  const channelIcon = (ch: string) => {
    if (ch === 'email') return <Mail className="h-4 w-4" />
    if (ch === 'sms') return <Smartphone className="h-4 w-4" />
    if (ch === 'push') return <Radio className="h-4 w-4" />
    return <Bell className="h-4 w-4" />
  }

  const statusVariant = (
    s: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'delivered') return 'default'
    if (s === 'queued' || s === 'in_progress') return 'secondary'
    if (s === 'failed' || s === 'deprecated') return 'destructive'
    return 'outline'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts & Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Notification delivery statuses, retry queues, and dead-letter items
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-success/20 transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{metrics.totalSent}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-destructive/20 transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{metrics.totalFailed}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-primary/20 transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Queued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalQueued}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-warning/20 transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Dead Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{metrics.deadLetterCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              By Event Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.byEventType ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(metrics.byEventType ?? {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="text-sm">{k.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              By Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.byChannel ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(metrics.byChannel ?? {}).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {channelIcon(k)}
                      {k}
                    </span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter notification list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Event type</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              >
                <option value="">All</option>
                {EVENT_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="queued">Queued</option>
                <option value="in_progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all hover:shadow-card-hover">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Delivery status and retry information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left font-medium">Event</th>
                    <th className="h-12 px-4 text-left font-medium">Channel</th>
                    <th className="h-12 px-4 text-left font-medium">Status</th>
                    <th className="h-12 px-4 text-left font-medium">Attempts</th>
                    <th className="h-12 px-4 text-left font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.slice(0, 50).map((n: Notification) => (
                    <tr
                      key={n.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">{n.eventType.replace(/_/g, ' ')}</td>
                      <td className="p-4 flex items-center gap-2">
                        {channelIcon(n.channel)}
                        {n.channel}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant(n.status)}>
                          {n.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {n.attemptCount}/{n.maxAttempts}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(n.createdAt), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link to="/dashboard/admin/notifications">
          <ChevronRight className="h-4 w-4 mr-2" />
          Notification Config
        </Link>
      </Button>
    </div>
  )
}
