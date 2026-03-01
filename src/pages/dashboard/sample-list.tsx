/**
 * Technician Sample List (page_007)
 * List view with filters: status, date range, vialId search
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Droplets,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRBAC } from '@/hooks/useRBAC'
import { usePickupSamples, useSyncPickups } from '@/hooks/usePickupSamples'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Synced', label: 'Synced' },
  { value: 'Rejected', label: 'Rejected' },
]

export function SampleListPage() {
  const { hasPermission } = useRBAC()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  const { data, isLoading, refetch } = usePickupSamples()
  const syncMutation = useSyncPickups()

  const pickups = data?.merged ?? []
  const pendingCount = (pickups ?? []).filter(
    (p) => !p.synced && (p.status === 'Pending' || p.status === 'Submitted')
  ).length

  const filtered = useMemo(() => {
    let list = Array.isArray(pickups) ? pickups : []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.vialId?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (dateFrom) {
      list = list.filter((p) => new Date(p.timestamp) >= new Date(dateFrom))
    }
    if (dateTo) {
      list = list.filter((p) => new Date(p.timestamp) <= new Date(dateTo + 'T23:59:59'))
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [pickups, search, statusFilter, dateFrom, dateTo])

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

  if (!hasPermission('pickup', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to view samples.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sample List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All pickups with filters and search
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-2 text-sm',
              isOnline ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingCount > 0 && isOnline && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vial ID, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-[160px]"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-[140px]"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-[140px]"
              placeholder="To"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (filtered ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Droplets className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No samples found</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {search || statusFilter !== 'all' || dateFrom || dateTo
                  ? 'Try adjusting your filters or search to find samples.'
                  : 'Start by capturing your first water sample pickup.'}
              </p>
              {!search && statusFilter === 'all' && !dateFrom && !dateTo && (
                <Button asChild className="mt-6">
                  <Link to="/dashboard/pickups/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Pickup
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Vial ID</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Timestamp</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">pH</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Chlorine</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">GPS Accuracy</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Sync</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filtered ?? []).map((p) => (
                        <tr
                          key={p.id}
                          className="border-b transition-colors hover:bg-muted/30"
                        >
                          <td className="p-4 font-mono text-sm">{p.vialId || p.id.slice(0, 12)}</td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {format(new Date(p.timestamp), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="p-4">{p.pH ?? '—'}</td>
                          <td className="p-4">{p.chlorine ?? '—'} ppm</td>
                          <td className="p-4 text-sm">
                            {p.gpsAccuracy != null ? `±${p.gpsAccuracy.toFixed(0)}m` : '—'}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                p.status === 'Synced'
                                  ? 'success'
                                  : p.status === 'Rejected'
                                    ? 'rejected'
                                    : p.status === 'Submitted'
                                      ? 'accent'
                                      : 'pending'
                              }
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {p.synced ? (
                              <span className="text-success">✓</span>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Link to={`/dashboard/pickups/${p.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile card view */}
                <div className="block sm:hidden divide-y">
                  {(filtered ?? []).map((p) => (
                    <Link
                      key={p.id}
                      to={`/dashboard/pickups/${p.id}`}
                      className="block p-4 hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium">{p.vialId || p.id.slice(0, 12)}</span>
                          <Badge
                            variant={
                              p.status === 'Synced'
                                ? 'success'
                                : p.status === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                            }
                            className="ml-2"
                          >
                            {p.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(p.timestamp), 'MMM d')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        pH: {p.pH ?? '—'} · Cl: {p.chlorine ?? '—'} ppm
                        {!p.synced && ' · Pending sync'}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {(filtered ?? []).length} of {(pickups ?? []).length} samples
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
