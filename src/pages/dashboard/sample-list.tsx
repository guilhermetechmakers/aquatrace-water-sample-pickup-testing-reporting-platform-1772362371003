/**
 * Technician Sample List (page_007)
 * List view with filters: status, date range, site, pH range, chlorine range
 * Search: sampleId, site name, notes. Summary counts by status.
 * Integrated with SearchBar, FacetedFilterPanel, SavedSearchManager.
 */

import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Droplets,
  Plus,
  Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRBAC } from '@/hooks/useRBAC'
import { usePickupSamples, useSyncPickups } from '@/hooks/usePickupSamples'
import { useSites } from '@/hooks/useSites'
import { SearchBar, FacetedFilterPanel, SavedSearchManager } from '@/components/search'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { SearchFilters, SavedSearch } from '@/types/search'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Draft', label: 'Draft' },
  { value: 'PendingPickup', label: 'Pending Pickup' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Synced', label: 'Synced' },
  { value: 'InLab', label: 'In Lab' },
  { value: 'LabApproved', label: 'Lab Approved' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Rejected', label: 'Rejected' },
]

function getStatusBadgeVariant(status: string): 'success' | 'rejected' | 'accent' | 'pending' | 'secondary' {
  switch (status) {
    case 'Synced':
    case 'LabApproved':
    case 'Archived':
      return 'success'
    case 'Rejected':
      return 'rejected'
    case 'Submitted':
    case 'InLab':
      return 'accent'
    case 'Draft':
    case 'PendingPickup':
    case 'Pending':
    default:
      return 'pending'
  }
}

export function SampleListPage() {
  const { hasPermission } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()

  const searchFromUrl = searchParams.get('q') ?? ''
  const statusFromUrl = searchParams.get('status') ?? 'all'
  const siteFromUrl = searchParams.get('site') ?? 'all'
  const dateFromUrl = searchParams.get('from') ?? ''
  const dateToUrl = searchParams.get('to') ?? ''

  const [search, setSearch] = useState(searchFromUrl)
  const [statusFilter, setStatusFilter] = useState<string>(statusFromUrl)
  const [siteFilter, setSiteFilter] = useState<string>(siteFromUrl)
  const [dateFrom, setDateFrom] = useState(dateFromUrl)
  const [dateTo, setDateTo] = useState(dateToUrl)
  const [pHMin, setPHMin] = useState('')
  const [pHMax, setPHMax] = useState('')
  const [chlorineMin, setChlorineMin] = useState('')
  const [chlorineMax, setChlorineMax] = useState('')
  const [savedSearchOpen, setSavedSearchOpen] = useState(false)
  const [isOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (siteFilter !== 'all') params.set('site', siteFilter)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    setSearchParams(params, { replace: true })
  }, [search, statusFilter, siteFilter, dateFrom, dateTo, setSearchParams])

  useEffect(() => {
    setSearch(searchFromUrl)
    setStatusFilter(statusFromUrl)
    setSiteFilter(siteFromUrl)
    setDateFrom(dateFromUrl)
    setDateTo(dateToUrl)
  }, [searchFromUrl, statusFromUrl, siteFromUrl, dateFromUrl, dateToUrl])

  const { data, isLoading, refetch } = usePickupSamples()
  const syncMutation = useSyncPickups()
  const { data: sites = [] } = useSites()

  const filters: SearchFilters = useMemo(
    () => ({
      status: statusFilter === 'all' ? undefined : statusFilter,
      siteId: siteFilter === 'all' ? undefined : siteFilter,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
    }),
    [statusFilter, siteFilter, dateFrom, dateTo]
  )

  const handleFiltersChange = (f: SearchFilters) => {
    const statusVal = f.status
    setStatusFilter(
      Array.isArray(statusVal) ? (statusVal[0] ?? 'all') : (statusVal ?? 'all')
    )
    setSiteFilter(f.siteId ?? 'all')
    setDateFrom(f.startDate ?? '')
    setDateTo(f.endDate ?? '')
  }

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setSearch(saved.query ?? '')
    setStatusFilter(
      Array.isArray(saved.filters?.status)
        ? (saved.filters?.status[0] ?? 'all')
        : (saved.filters?.status ?? 'all')
    )
    setSiteFilter(saved.filters?.siteId ?? 'all')
    setDateFrom(saved.filters?.startDate ?? '')
    setDateTo(saved.filters?.endDate ?? '')
  }

  const pickups = data?.merged ?? []
  const pendingCount = (pickups ?? []).filter(
    (p) => !p.synced && (p.status === 'Pending' || p.status === 'Submitted' || p.status === 'PendingPickup')
  ).length

  const summaryCounts = useMemo(() => {
    const list = Array.isArray(pickups) ? pickups : []
    const counts: Record<string, number> = {}
    for (const p of list) {
      const s = p.status ?? 'Pending'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return counts
  }, [pickups])

  const siteMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sites ?? []) {
      map.set(s.id, s.name)
    }
    return map
  }, [sites])

  const filtered = useMemo(() => {
    let list = Array.isArray(pickups) ? pickups : []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.vialId?.toLowerCase().includes(q) ||
          p.sampleId?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.customerSiteNotes?.toLowerCase().includes(q) ||
          p.pickupLocationName?.toLowerCase().includes(q) ||
          (p.siteId && siteMap.get(p.siteId)?.toLowerCase().includes(q))
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (siteFilter !== 'all') {
      list = list.filter((p) => p.siteId === siteFilter)
    }
    if (dateFrom) {
      list = list.filter((p) => new Date(p.timestamp) >= new Date(dateFrom))
    }
    if (dateTo) {
      list = list.filter((p) => new Date(p.timestamp) <= new Date(dateTo + 'T23:59:59'))
    }
    if (pHMin !== '') {
      const min = Number(pHMin)
      if (!Number.isNaN(min)) {
        list = list.filter((p) => p.pH != null && p.pH >= min)
      }
    }
    if (pHMax !== '') {
      const max = Number(pHMax)
      if (!Number.isNaN(max)) {
        list = list.filter((p) => p.pH != null && p.pH <= max)
      }
    }
    const clVal = (p: (typeof list)[0]) => p.chlorineReading ?? p.chlorine
    if (chlorineMin !== '') {
      const min = Number(chlorineMin)
      if (!Number.isNaN(min)) {
        list = list.filter((p) => {
          const v = clVal(p)
          return v != null && v >= min
        })
      }
    }
    if (chlorineMax !== '') {
      const max = Number(chlorineMax)
      if (!Number.isNaN(max)) {
        list = list.filter((p) => {
          const v = clVal(p)
          return v != null && v <= max
        })
      }
    }
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [
    pickups,
    search,
    statusFilter,
    siteFilter,
    dateFrom,
    dateTo,
    pHMin,
    pHMax,
    chlorineMin,
    chlorineMax,
    siteMap,
  ])

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
            All pickups with filters, search, and summary counts
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
          <Button asChild size="sm">
            <Link to="/dashboard/pickups/new">
              <Plus className="h-4 w-4 mr-1" />
              New Pickup
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary counts by status */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(summaryCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === status
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-muted/50'
            )}
          >
            <Badge variant={getStatusBadgeVariant(status)} className="mr-1.5">
              {status}
            </Badge>
            {count}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search sample ID, vial ID, site, notes..."
                  entityType="samples"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-[160px]"
                  aria-label="Filter by status"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-[180px]"
                  aria-label="Filter by site"
                >
                  <option value="all">All sites</option>
                  {(sites ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSavedSearchOpen(true)}
                  aria-label="Manage saved searches"
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Saved
                </Button>
              </div>
            </div>
            <FacetedFilterPanel
              filters={filters}
              onChange={handleFiltersChange}
              entityType="samples"
              statusOptions={STATUS_OPTIONS}
              sites={(sites ?? []).map((s) => ({ id: s.id, name: s.name }))}
            />
            <SavedSearchManager
              open={savedSearchOpen}
              onOpenChange={setSavedSearchOpen}
              onLoadSearch={handleLoadSavedSearch}
              currentFilters={filters}
              currentQuery={search}
              currentType="samples"
            />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="14"
                placeholder="pH min"
                value={pHMin}
                onChange={(e) => setPHMin(e.target.value)}
                aria-label="pH minimum"
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                max="14"
                placeholder="pH max"
                value={pHMax}
                onChange={(e) => setPHMax(e.target.value)}
                aria-label="pH maximum"
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Cl min (ppm)"
                value={chlorineMin}
                onChange={(e) => setChlorineMin(e.target.value)}
                aria-label="Chlorine minimum"
              />
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Cl max (ppm)"
                value={chlorineMax}
                onChange={(e) => setChlorineMax(e.target.value)}
                aria-label="Chlorine maximum"
              />
            </div>
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
                {search || statusFilter !== 'all' || siteFilter !== 'all' || dateFrom || dateTo || pHMin || pHMax || chlorineMin || chlorineMax
                  ? 'Try adjusting your filters or search to find samples.'
                  : 'Start by capturing your first water sample pickup.'}
              </p>
              {!search && statusFilter === 'all' && siteFilter === 'all' && !dateFrom && !dateTo && !pHMin && !pHMax && !chlorineMin && !chlorineMax && (
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
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b bg-muted/50 sticky top-0">
                      <th className="h-12 px-4 text-left align-middle font-medium">Sample ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Vial ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Timestamp</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">pH</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Chlorine</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">GPS Acc.</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Sync</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Last Modified</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtered ?? []).map((p) => (
                      <tr
                        key={p.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-4 font-mono text-sm">
                          {p.sampleId ?? p.id.slice(0, 12)}
                        </td>
                        <td className="p-4 font-mono text-sm">{p.vialId ?? '—'}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(p.timestamp), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="p-4">{p.pH ?? '—'}</td>
                        <td className="p-4">
                          {(p.chlorineReading ?? p.chlorine) ?? '—'} ppm
                        </td>
                        <td className="p-4 text-sm">
                          {p.gpsAccuracy != null ? `±${p.gpsAccuracy.toFixed(0)}m` : '—'}
                        </td>
                        <td className="p-4">
                          <Badge variant={getStatusBadgeVariant(p.status ?? 'Pending')}>
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
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(p.updatedAt), 'MMM d, HH:mm')}
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
              <div className="block sm:hidden divide-y border rounded-md mt-4">
                {(filtered ?? []).map((p) => (
                  <Link
                    key={p.id}
                    to={`/dashboard/pickups/${p.id}`}
                    className="block p-4 hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">
                          {p.sampleId ?? p.vialId ?? p.id.slice(0, 12)}
                        </span>
                        <Badge
                          variant={getStatusBadgeVariant(p.status ?? 'Pending')}
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
                      pH: {p.pH ?? '—'} · Cl: {(p.chlorineReading ?? p.chlorine) ?? '—'} ppm
                      {!p.synced && ' · Pending sync'}
                    </p>
                  </Link>
                ))}
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
