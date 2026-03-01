/**
 * Admin Notification Configuration (page_011)
 * Integrations, webhooks, throttling, retention
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Mail,
  Smartphone,
  Radio,
  Webhook,
  Settings,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRBAC } from '@/hooks/useRBAC'
import {
  useRegisterWebhook,
  usePublishTestEvent,
  useAudit,
} from '@/hooks/useNotifications'

const EVENT_TYPES = [
  'pickup_assigned',
  'pickup_completed',
  'lab_results_ready',
  'approval_needed',
  'invoice_created',
  'invoice_paid',
  'sla_breach',
] as const

export function AdminNotificationsConfigPage() {
  const { hasPermission } = useRBAC()
  const { data: audit } = useAudit()
  const registerWebhook = useRegisterWebhook()
  const publishTest = usePublishTestEvent()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<string>('pickup_assigned')

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access notification configuration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const metrics = audit?.metrics ?? {
    totalSent: 0,
    totalFailed: 0,
    totalQueued: 0,
    deadLetterCount: 0,
    byEventType: {},
    byChannel: {},
  }

  const handleRegisterWebhook = () => {
    if (!webhookUrl.trim()) return
    registerWebhook.mutate({
      url: webhookUrl.trim(),
      events_enabled: EVENT_TYPES as unknown as string[],
    })
    setWebhookUrl('')
  }

  const handlePublishTest = () => {
    publishTest.mutate({
      eventType: selectedEvent,
      payload: { customerName: 'Test Customer' },
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Configuration</h1>
        <p className="mt-1 text-muted-foreground">
          Manage integrations, webhooks, throttling, and retention
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-success/20 transition-all hover:shadow-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4 text-success" />
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
              <Smartphone className="h-4 w-4 text-destructive" />
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
              <Bell className="h-4 w-4 text-primary" />
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
              <Radio className="h-4 w-4 text-warning" />
              Dead Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{metrics.deadLetterCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Integrations
            </CardTitle>
            <CardDescription>
              SendGrid (email), Twilio (SMS), FCM (push). Configure via Supabase secrets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">SendGrid</p>
                <p className="text-sm text-muted-foreground">Transactional email</p>
              </div>
              <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">
                Ready
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Twilio</p>
                <p className="text-sm text-muted-foreground">SMS & voice</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Configure
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Firebase FCM</p>
                <p className="text-sm text-muted-foreground">Push notifications</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Configure
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Register endpoints to receive event payloads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={registerWebhook.isPending}
                />
                <Button
                  onClick={handleRegisterWebhook}
                  disabled={!webhookUrl.trim() || registerWebhook.isPending}
                >
                  {registerWebhook.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all hover:shadow-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Test Dispatch
          </CardTitle>
          <CardDescription>
            Manually trigger a test notification event
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[12rem]">
            <Label htmlFor="test-event">Event type</Label>
            <select
              id="test-event"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handlePublishTest}
            disabled={publishTest.isPending}
          >
            {publishTest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Publish Test Event
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link to="/dashboard/admin/templates">
            <ChevronRight className="h-4 w-4 mr-2" />
            Template Management
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/dashboard/alerts">
            <ChevronRight className="h-4 w-4 mr-2" />
            Alerts & Analytics
          </Link>
        </Button>
      </div>
    </div>
  )
}
