import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Camera,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Plus,
  Bell,
  Droplets,
  CheckCircle,
  Clock,
  ListOrdered,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRBAC } from '@/hooks/useRBAC'
import { usePickupSamples, useSyncPickups } from '@/hooks/usePickupSamples'
import { useMyNotifications, subscribeToNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/contexts/auth-context'
import { NOTIFICATION_EVENT_LABELS } from '@/types/notifications'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function TechnicianDashboardPage() {
  const { hasPermission } = useRBAC()
  const { user } = useAuth()
  const { data, isLoading, refetch } = usePickupSamples()
  const { data: notifData, refetch: refetchNotifs } = useMyNotifications(10)
  const syncMutation = useSyncPickups()
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    return subscribeToNotifications(user.id, () => {}, refetchNotifs)
  }, [user?.id, refetchNotifs])

  const canCreate = hasPermission('pickup', 'create')
  const pickups = data?.merged ?? []
  const assignedPickups = (pickups ?? []).slice(0, 5)

  const quickStats = useMemo(() => {
    const list = Array.isArray(pickups) ? pickups : []
    const pendingSubmissions = list.filter(
      (p) => !p.synced && (p.status === 'Pending' || p.status === 'Submitted' || p.status === 'PendingPickup')
    ).length
    const recentlySynced = list.filter(
      (p) => p.synced && (p.status === 'Synced' || p.status === 'LabApproved')
    ).length
    const upcoming = list.filter(
      (p) =>
        p.status === 'Draft' ||
        p.status === 'PendingPickup' ||
        p.status === 'Pending'
    ).length
    return { pendingSubmissions, recentlySynced, upcoming }
  }, [pickups])

  const pendingCount = quickStats.pendingSubmissions

  const handleSync = () => {
    if (!isOnline) {
      toast.error('You are offline. Connect to sync.')
      return
    }
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(`Synced ${result.syncedCount} pickup(s)`)
          refetch()
        } else if (result.failedCount > 0) {
          toast.error(result.errors?.[0] ?? 'Sync failed')
        }
      },
    })
  }

  if (!hasPermission('pickup', 'read') && !hasPermission('pickup', 'create')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view the technician dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technician Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Assigned pickups, quick capture, and sync status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
              isOnline ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'
            )}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {canCreate && (
            <Button asChild>
              <Link to="/dashboard/pickups/new">
                <Plus className="h-4 w-4 mr-2" />
                New Pickup
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-card-hover border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.upcoming}</p>
                <p className="text-sm text-muted-foreground">Upcoming pickups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-card-hover border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent/10 p-3">
                <ListOrdered className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.pendingSubmissions}</p>
                <p className="text-sm text-muted-foreground">Pending submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="transition-all duration-200 hover:shadow-card-hover border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-success/10 p-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quickStats.recentlySynced}</p>
                <p className="text-sm text-muted-foreground">Recently synced</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-200 hover:shadow-card-hover md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Assigned Pickups
            </CardTitle>
            <CardDescription>
              Your recent pickups — tap to view details or start a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : (assignedPickups ?? []).length > 0 ? (
              <div className="space-y-3">
                {(assignedPickups ?? []).map((p) => (
                  <Link
                    key={p.id}
                    to={`/dashboard/pickups/${p.id}`}
                    className="block rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-card min-h-[72px] active:bg-muted/50 touch-manipulation"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-medium">{p.vialId || p.id.slice(0, 12)}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.pickupLocationName ?? p.location ?? `Sample ${p.vialId}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant={
                              p.status === 'Synced' || p.status === 'LabApproved' || p.status === 'Archived'
                                ? 'success'
                                : p.status === 'Rejected'
                                  ? 'rejected'
                                  : p.status === 'Submitted' || p.status === 'InLab'
                                    ? 'accent'
                                    : 'pending'
                            }
                          >
                            {p.status}
                          </Badge>
                          {!p.synced && (
                            <span className="text-xs text-muted-foreground">
                              Pending sync
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.updatedAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Droplets className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No pickups yet</p>
                {canCreate && (
                  <Button asChild className="mt-4">
                    <Link to="/dashboard/pickups/new">Start your first pickup</Link>
                  </Button>
                )}
              </div>
            )}
            {(pickups ?? []).length > 5 && (
              <Button
                variant="outline"
                className="mt-4 w-full min-h-[44px] touch-manipulation"
                asChild
              >
                <Link to="/dashboard/pickups/samples">View all samples</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="transition-all duration-200 hover:shadow-card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Quick Capture
              </CardTitle>
              <CardDescription>
                One-tap to start a new pickup with barcode scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canCreate ? (
                <Button
                  asChild
                  className="w-full min-h-[48px] touch-manipulation"
                  size="lg"
                >
                  <Link to="/dashboard/pickups/new">
                    <Camera className="h-5 w-5 mr-2" />
                    Scan & Capture
                  </Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have permission to create pickups.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Sync Center
              </CardTitle>
              <CardDescription>
                Pending offline items and sync status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">
                  Pending sync
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSync}
                disabled={syncMutation.isPending || !isOnline || pendingCount === 0}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                Notifications Center
              </CardTitle>
              <CardDescription>
                Recent alerts: pickups, lab results, approvals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(notifData?.notifications ?? []).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(notifData?.notifications ?? []).slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 text-sm"
                    >
                      <span className="font-medium">
                        {NOTIFICATION_EVENT_LABELS[n.eventType as keyof typeof NOTIFICATION_EVENT_LABELS] ?? n.eventType}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent notifications</p>
              )}
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to="/dashboard/pickups/samples" className="flex items-center justify-center gap-2">
                  View samples
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
