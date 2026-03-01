import { useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MapPin,
  Camera,
  Gauge,
  Droplets,
  ArrowLeft,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  usePickupSample,
  usePickupPhotos,
  useSyncPickups,
  usePickupAuditTrail,
  usePickupStatusHistory,
} from '@/hooks/usePickupSamples'
import { useLabResults } from '@/hooks/useLabResults'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { AuditTrailEntry, StatusHistoryEntry } from '@/types/pickup-sample'

export function SampleDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: pickup, isLoading, refetch } = usePickupSample(id ?? null)
  const { data: photos = [] } = usePickupPhotos(id ?? null)
  const { data: auditTrail = [] } = usePickupAuditTrail(id ?? null)
  const { data: statusHistory = [] } = usePickupStatusHistory(id ?? null)
  const { data: labResults = [] } = useLabResults(pickup?.serverId ?? undefined)
  const syncMutation = useSyncPickups()
  const [expandedAudit, setExpandedAudit] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(false)

  const displayAudit = useMemo(() => {
    const audit = Array.isArray(auditTrail) ? auditTrail : []
    if (audit.length > 0) return audit
    if (!pickup) return []
    return [
      {
        id: 'synthetic-created',
        pickupId: pickup.id,
        action: 'Created',
        byUserId: pickup.technicianId,
        timestamp: pickup.createdAt,
      } as AuditTrailEntry,
      ...(pickup.updatedAt !== pickup.createdAt
        ? [
            {
              id: 'synthetic-updated',
              pickupId: pickup.id,
              action: 'Updated',
              byUserId: pickup.technicianId,
              timestamp: pickup.updatedAt,
            } as AuditTrailEntry,
          ]
        : []),
    ]
  }, [auditTrail, pickup])

  const displayStatusHistory = useMemo(() => {
    const history = Array.isArray(statusHistory) ? statusHistory : []
    if (history.length > 0) return history
    if (!pickup) return []
    return [
      {
        id: 'synthetic-status',
        pickupId: pickup.id,
        status: pickup.status,
        timestamp: pickup.updatedAt,
        note: null,
      } as StatusHistoryEntry,
    ]
  }, [statusHistory, pickup])

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('Synced')
          refetch()
        } else {
          toast.error(result.errors?.[0] ?? 'Sync failed')
        }
      },
    })
  }

  if (!id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Sample not found.</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link to="/dashboard/pickups">Back to Pickups</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading || !pickup) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const displayPhotos = Array.isArray(photos) ? photos : (pickup.photos ?? [])

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/pickups">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              pickup.status === 'Synced'
                ? 'success'
                : pickup.status === 'Rejected'
                  ? 'rejected'
                  : pickup.status === 'Submitted'
                    ? 'accent'
                    : 'pending'
            }
          >
            {pickup.status}
          </Badge>
          {!pickup.synced && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{pickup.vialId || pickup.id.slice(0, 12)}</CardTitle>
          <CardDescription>
            {pickup.location ?? `Sample ${pickup.vialId}`} ·{' '}
            {format(new Date(pickup.timestamp), 'MMM d, yyyy HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Gauge className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">pH</p>
                <p className="text-xl font-semibold">
                  {pickup.pH != null ? String(pickup.pH) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Droplets className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Chlorine (mg/L)</p>
                <p className="text-xl font-semibold">
                  {pickup.chlorine != null ? String(pickup.chlorine) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-4">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">GPS</p>
              <p className="font-mono text-sm">
                {pickup.gpsLat != null && pickup.gpsLon != null
                  ? `${pickup.gpsLat.toFixed(6)}, ${pickup.gpsLon.toFixed(6)}`
                  : 'Not captured'}
              </p>
              {pickup.gpsAccuracy != null && (
                <p className="text-xs text-muted-foreground">
                  Accuracy: ±{pickup.gpsAccuracy.toFixed(0)}m
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Volume</p>
            <p className="text-muted-foreground">{pickup.volume} mL</p>
          </div>

          {pickup.customerSiteNotes && (
            <div>
              <p className="text-sm font-medium">Site Notes</p>
              <p className="text-muted-foreground">{pickup.customerSiteNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {displayPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {displayPhotos.map((ph) => (
                <a
                  key={ph.id}
                  href={ph.serverUrl ?? ph.localUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={ph.serverUrl ?? ph.localUri}
                    alt="Sample"
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Array.isArray(labResults) && labResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Results</CardTitle>
            <CardDescription>SPC and Total Coliform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labResults.map((lr) => (
                <div
                  key={lr.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">SPC</p>
                    <p className="font-semibold">
                      {lr.spc != null ? String(lr.spc) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Coliform</p>
                    <p className="font-semibold">
                      {lr.total_coliform != null
                        ? String(lr.total_coliform)
                        : '—'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      lr.status === 'approved'
                        ? 'success'
                        : lr.status === 'rejected'
                          ? 'rejected'
                          : 'pending'
                    }
                  >
                    {lr.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setExpandedHistory(!expandedHistory)}
            aria-expanded={expandedHistory}
          >
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Status History
            </CardTitle>
            {expandedHistory ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <CardDescription>
            Pending, Submitted, Synced, Rejected with timestamps
          </CardDescription>
        </CardHeader>
        {expandedHistory && (
          <CardContent>
            <div className="space-y-2">
              {(displayStatusHistory ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        entry.status === 'Synced'
                          ? 'success'
                          : entry.status === 'Rejected'
                            ? 'rejected'
                            : entry.status === 'Submitted'
                              ? 'accent'
                              : 'pending'
                      }
                    >
                      {entry.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  {entry.note && (
                    <p className="mt-2 text-sm text-muted-foreground">{entry.note}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setExpandedAudit(!expandedAudit)}
            aria-expanded={expandedAudit}
          >
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            {expandedAudit ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
          <CardDescription>
            Creation, updates, sync events with timestamps
          </CardDescription>
        </CardHeader>
        {expandedAudit && (
          <CardContent>
            <div className="space-y-2">
              {(displayAudit ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{entry.action}</p>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    By user: {entry.byUserId.slice(0, 8)}…
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
