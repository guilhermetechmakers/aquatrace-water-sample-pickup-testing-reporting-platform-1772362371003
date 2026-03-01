/**
 * AdminSettingsPanel - Stripe webhook configs, tax settings, currency, reminders cadence
 */

import { Settings, Webhook, Percent, DollarSign, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export interface AdminSettingsPanelProps {
  isLoading?: boolean
  currency?: string
  defaultTaxRate?: number
  remindersCadence?: string
  webhookConfigured?: boolean
  onSave?: (settings: {
    currency?: string
    defaultTaxRate?: number
    remindersCadence?: string
  }) => void
}

export function AdminSettingsPanel({
  isLoading = false,
  currency = 'USD',
  defaultTaxRate = 0,
  remindersCadence = '7,14,30',
  webhookConfigured = false,
  onSave,
}: AdminSettingsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Billing Settings
        </CardTitle>
        <CardDescription>
          Configure Stripe webhooks, tax defaults, and reminder cadence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
          <Webhook className="h-8 w-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">Stripe Webhook</p>
            <p className="text-sm text-muted-foreground">
              {webhookConfigured
                ? 'Webhook endpoint configured. Events will sync automatically.'
                : 'Configure your Stripe webhook endpoint to sync payment events.'}
            </p>
          </div>
          <Badge variant={webhookConfigured ? 'approved' : 'pending'}>
            {webhookConfigured ? 'Configured' : 'Not configured'}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Default Currency
            </Label>
            <Input
              id="currency"
              value={currency}
              readOnly
              className="mt-1 bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="taxRate" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Default Tax Rate (%)
            </Label>
            <Input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={defaultTaxRate}
              readOnly
              className="mt-1 bg-muted"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Reminder Cadence (days)
          </Label>
          <Input
            id="reminders"
            placeholder="7,14,30"
            value={remindersCadence}
            readOnly
            className="mt-1 bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Comma-separated days after due date to send reminders
          </p>
        </div>

        {onSave && (
          <Button onClick={() => onSave({ currency, defaultTaxRate, remindersCadence })}>
            Save Settings
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
