import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useProfile'
import { Bell, Mail, Smartphone, MessageSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function NotificationSettingsPanel() {
  const { data, isLoading, error } = useNotificationSettings()
  const updateSettings = useUpdateNotificationSettings()

  const channels = data?.channels ?? {
    email: true,
    inApp: true,
    sms: false,
  }

  const handleChannelChange = (channel: 'email' | 'inApp' | 'sms', checked: boolean) => {
    updateSettings.mutate({
      channels: { ...channels, [channel]: checked },
    })
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
            disabled={updateSettings.isPending}
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
            disabled={updateSettings.isPending}
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
            disabled={updateSettings.isPending}
            aria-label="Toggle SMS notifications"
          />
        </div>
      </CardContent>
    </Card>
  )
}
