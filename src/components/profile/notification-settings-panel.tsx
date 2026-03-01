import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useProfile'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotifications'
import { useAuth } from '@/contexts/auth-context'
import { Bell, Mail, Smartphone, MessageSquare, Settings, Clock, Smartphone as PushIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export function NotificationSettingsPanel() {
  const { user } = useAuth()
  const { data, isLoading: profileLoading, error: profileError } = useNotificationSettings()
  const updateSettings = useUpdateNotificationSettings()
  const { data: prefs, isLoading: prefsLoading, error: prefsError } = useNotificationPreferences(user?.id)
  const updatePrefs = useUpdateNotificationPreferences(user?.id)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'LAB_MANAGER'
  const useNewApi = isSupabaseConfigured()

  const isLoading = useNewApi ? prefsLoading : profileLoading
  const error = useNewApi ? prefsError : profileError

  const channels = useNewApi
    ? {
        email: prefs?.channelsEnabled?.email ?? true,
        sms: prefs?.channelsEnabled?.sms ?? false,
        push: prefs?.channelsEnabled?.push ?? false,
        inApp: prefs?.channelsEnabled?.in_app ?? true,
      }
    : {
        email: data?.channels?.email ?? true,
        inApp: data?.channels?.inApp ?? true,
        sms: data?.channels?.sms ?? false,
        push: false,
      }

  const preferences = data?.preferences ?? {
    accountAlerts: true,
    sampleUpdates: true,
    reportReady: true,
  }

  const maxPerHour = prefs?.maxPerHour ?? 10
  const blackoutStart = prefs?.blackoutStart ?? ''
  const blackoutEnd = prefs?.blackoutEnd ?? ''
  const fallbackToEmail = prefs?.fallbackToEmail ?? true

  const handleChannelChange = (
    channel: 'email' | 'inApp' | 'sms' | 'push',
    checked: boolean
  ) => {
    if (useNewApi) {
      const ch = {
        email: channels.email,
        sms: channels.sms,
        push: channels.push,
        in_app: channels.inApp,
      }
      const next = { ...ch, [channel === 'inApp' ? 'in_app' : channel]: checked }
      updatePrefs.mutate({ channelsEnabled: next })
    } else {
      updateSettings.mutate({ channels: { ...channels, [channel]: checked } })
    }
  }

  const handlePreferenceChange = (key: 'accountAlerts' | 'sampleUpdates' | 'reportReady', checked: boolean) => {
    if (!useNewApi) {
      updateSettings.mutate({
        preferences: { ...preferences, [key]: checked },
      })
    }
  }

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="animate-fade-in border-destructive/50">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Unable to load notification settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications. You can enable or disable each channel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="email-notifications" className="font-medium">
                Email notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email for account alerts and updates
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={channels.email ?? true}
            onCheckedChange={(checked) => handleChannelChange('email', checked)}
            disabled={(useNewApi ? updatePrefs : updateSettings).isPending}
            aria-label="Toggle email notifications"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="inapp-notifications" className="font-medium">
                In-app notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
          </div>
          <Switch
            id="inapp-notifications"
            checked={channels.inApp ?? true}
            onCheckedChange={(checked) => handleChannelChange('inApp', checked)}
            disabled={(useNewApi ? updatePrefs : updateSettings).isPending}
            aria-label="Toggle in-app notifications"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="sms-notifications" className="font-medium">
                SMS notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via text message (requires phone number)
              </p>
            </div>
          </div>
          <Switch
            id="sms-notifications"
            checked={channels.sms ?? false}
            onCheckedChange={(checked) => handleChannelChange('sms', checked)}
            disabled={(useNewApi ? updatePrefs : updateSettings).isPending}
            aria-label="Toggle SMS notifications"
          />
        </div>

        {useNewApi && (
          <div className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <PushIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="push-notifications" className="font-medium">
                  Push notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Real-time push alerts on mobile and web
                </p>
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={channels.push ?? false}
              onCheckedChange={(checked) => handleChannelChange('push', checked)}
              disabled={updatePrefs.isPending}
              aria-label="Toggle push notifications"
            />
          </div>
        )}

        {useNewApi && (
          <div className="border-t border-border pt-6 space-y-6">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Throttling & Do Not Disturb
            </h4>
            <div className="space-y-2">
              <Label htmlFor="max-per-hour">Max notifications per hour</Label>
              <Input
                id="max-per-hour"
                type="number"
                min={1}
                max={100}
                value={maxPerHour}
                onChange={(e) =>
                  updatePrefs.mutate({
                    maxPerHour: Math.max(1, Math.min(100, Number(e.target.value) || 10)),
                  })
                }
                disabled={updatePrefs.isPending}
                className="max-w-[8rem]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blackout-start">Do not disturb start</Label>
                <Input
                  id="blackout-start"
                  type="time"
                  value={blackoutStart}
                  onChange={(e) =>
                    updatePrefs.mutate({ blackoutStart: e.target.value, blackoutEnd })
                  }
                  disabled={updatePrefs.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blackout-end">Do not disturb end</Label>
                <Input
                  id="blackout-end"
                  type="time"
                  value={blackoutEnd}
                  onChange={(e) =>
                    updatePrefs.mutate({ blackoutStart, blackoutEnd: e.target.value })
                  }
                  disabled={updatePrefs.isPending}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label htmlFor="fallback-email" className="font-medium">
                  Fallback to email if SMS fails
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send via email when SMS delivery fails
                </p>
              </div>
              <Switch
                id="fallback-email"
                checked={fallbackToEmail}
                onCheckedChange={(checked) =>
                  updatePrefs.mutate({ fallbackToEmail: checked })
                }
                disabled={updatePrefs.isPending}
                aria-label="Toggle fallback to email"
              />
            </div>
          </div>
        )}

        {!useNewApi && (
        <div className="border-t border-border pt-6">
          <h4 className="text-sm font-medium mb-4">Event preferences</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <Label htmlFor="account-alerts" className="font-medium">
                Account alerts
              </Label>
              <Switch
                id="account-alerts"
                checked={preferences.accountAlerts ?? true}
                onCheckedChange={(checked) => handlePreferenceChange('accountAlerts', checked)}
                disabled={updateSettings.isPending}
                aria-label="Toggle account alerts"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <Label htmlFor="sample-updates" className="font-medium">
                Sample & pickup updates
              </Label>
              <Switch
                id="sample-updates"
                checked={preferences.sampleUpdates ?? true}
                onCheckedChange={(checked) => handlePreferenceChange('sampleUpdates', checked)}
                disabled={updateSettings.isPending}
                aria-label="Toggle sample updates"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <Label htmlFor="report-ready" className="font-medium">
                Report ready notifications
              </Label>
              <Switch
                id="report-ready"
                checked={preferences.reportReady ?? true}
                onCheckedChange={(checked) => handlePreferenceChange('reportReady', checked)}
                disabled={updateSettings.isPending}
                aria-label="Toggle report ready"
              />
            </div>
          </div>
        </div>
        )}

        {isAdmin && (
          <div className="border-t border-border pt-6 space-y-2">
            <h4 className="text-sm font-medium">Admin</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/notifications">
                  <Settings className="h-4 w-4 mr-2" />
                  Notification Config
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/admin/templates">Templates</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/alerts">Alerts & Analytics</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
