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
  AlertCircle,
  Inbox,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  const { data, isLoading, isError, error, refetch } = usePickupSamples()
  const { data: notifData, isLoading: notifLoading, isError: notifError, refetch: refetchNotifs } = useMyNotifications(10)
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
            role="status"
            aria-live="polite"
            aria-label={isOnline ? 'Connection status: Online' : 'Connection status: Offline'}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm',
              isOnline ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'
            )}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" aria-hidden />
            ) : (
              <WifiOff className="h-4 w-4" aria-hidden />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {canCreate && (
            <Button asChild>
              <Link to="/dashboard/pickups/new" aria-label="Create new pickup">
                <Plus className="h-4 w-4 mr-2" aria-hidden />
                New Pickup
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="transition-all duration-200 border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="transition-all duration-200 hover:shadow-card-hover border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3" aria-hidden>
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
                  <div className="rounded-lg bg-accent/10 p-3" aria-hidden>
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
                  <div className="rounded-lg bg-success/10 p-3" aria-hidden>
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{quickStats.recentlySynced}</p>
                    <p className="text-sm text-muted-foreground">Recently synced</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
              <div className="space-y-3" role="status" aria-label="Loading assigned pickups">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div
                className="flex flex-col items-center justify-center py-12 px-4 text-center"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="h-12 w-12 text-destructive mb-4" aria-hidden />
                <p className="font-medium text-foreground">Failed to load pickups</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 min-h-[44px]"
                  onClick={() => refetch()}
                  aria-label="Retry loading pickups"
                >
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
                  Try again
                </Button>
              </div>
            ) : (assignedPickups ?? []).length > 0 ? (
              <div className="space-y-3">
                {(assignedPickups ?? []).map((p) => {
                  const vialLabel = p.vialId ?? p.id.slice(0, 12)
                  const locationLabel = p.pickupLocationName ?? p.location ?? `Sample ${p.vialId}`
                  return (
                    <Link
                      key={p.id}
                      to={`/dashboard/pickups/${p.id}`}
                      aria-label={`View pickup ${vialLabel} at ${locationLabel}, status ${p.status}`}
                      className="block rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-card min-h-[72px] active:bg-muted/50 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-medium">{vialLabel}</p>
                          <p className="text-sm text-muted-foreground">{locationLabel}</p>
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
                              <span className="text-xs text-muted-foreground">Pending sync</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.updatedAt), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-12 px-4 text-center"
                role="status"
                aria-label="No pickups assigned"
              >
                <div className="rounded-full bg-muted/50 p-4 mb-4">
                  <Droplets className="h-12 w-12 text-muted-foreground" aria-hidden />
                </div>
                <p className="font-medium text-foreground">No pickups assigned yet</p>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Your assigned water sample pickups will appear here. Start your first pickup to get going.
                </p>
                {canCreate && (
                  <Button asChild className="mt-6 min-h-[44px]" size="lg">
                    <Link to="/dashboard/pickups/new" aria-label="Start your first pickup">
                      <Plus className="h-5 w-5 mr-2" aria-hidden />
                      Start your first pickup
                    </Link>
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
                <Link to="/dashboard/pickups/samples" aria-label="View all samples">
                  View all samples
                </Link>
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
                  <Link to="/dashboard/pickups/new" aria-label="Scan barcode and capture new pickup">
                    <Camera className="h-5 w-5 mr-2" aria-hidden />
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
                className="w-full min-h-[44px]"
                onClick={handleSync}
                disabled={syncMutation.isPending || !isOnline || pendingCount === 0}
                aria-label={syncMutation.isPending ? 'Syncing pickups' : 'Sync pending pickups'}
                aria-busy={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
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
              {notifLoading ? (
                <div className="space-y-2" role="status" aria-label="Loading notifications">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              ) : notifError ? (
                <div
                  className="flex flex-col items-center justify-center py-6 text-center"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" aria-hidden />
                  <p className="text-sm text-muted-foreground">Could not load notifications</p>
                </div>
              ) : (notifData?.notifications ?? []).length > 0 ? (
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
                <div
                  className="flex flex-col items-center justify-center py-6 text-center"
                  role="status"
                  aria-label="No recent notifications"
                >
                  <div className="rounded-full bg-muted/50 p-3 mb-2">
                    <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-sm font-medium text-foreground">No recent notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pickup updates and lab results will appear here
                  </p>
                </div>
              )}
              <Button variant="outline" size="sm" asChild className="w-full min-h-[44px]">
                <Link
                  to="/dashboard/pickups/samples"
                  className="flex items-center justify-center gap-2"
                  aria-label="View all samples"
                >
                  View samples
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
