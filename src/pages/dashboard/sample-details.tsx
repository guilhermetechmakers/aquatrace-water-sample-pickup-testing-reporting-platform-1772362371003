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
  Send,
  CheckCircle,
  Archive,
  XCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  usePickupSample,
  usePickupPhotos,
  useSyncPickups,
  usePickupAuditTrail,
  usePickupStatusHistory,
  useUpdatePickupSample,
} from '@/hooks/usePickupSamples'
import { useLabResults } from '@/hooks/useLabResults'
import { useAuth } from '@/contexts/auth-context'
import { useSites } from '@/hooks/useSites'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  getAllowedActions,
  getNextState,
  type WorkflowAction,
} from '@/lib/sample-workflow'
import type { AuditTrailEntry, StatusHistoryEntry } from '@/types/pickup-sample'

function getStatusBadgeVariant(status: string): 'success' | 'rejected' | 'accent' | 'pending' {
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
    default:
      return 'pending'
  }
}

export function SampleDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: pickup, isLoading, refetch } = usePickupSample(id ?? null)
  const { data: photos = [] } = usePickupPhotos(id ?? null)
  const { data: auditTrail = [] } = usePickupAuditTrail(id ?? null)
  const { data: statusHistory = [] } = usePickupStatusHistory(id ?? null)
  const { data: labResults = [] } = useLabResults(pickup?.serverId ?? undefined)
  const { data: sites = [] } = useSites()
  const syncMutation = useSyncPickups()
  const updateMutation = useUpdatePickupSample()
  const [expandedAudit, setExpandedAudit] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  const role = user?.role ?? 'TECHNICIAN'
  const allowedActions = useMemo(
    () => (pickup ? getAllowedActions(pickup.status ?? 'Pending', role) : []),
    [pickup, role]
  )
  const siteName = useMemo(
    () => (pickup?.siteId ? (sites ?? []).find((s) => s.id === pickup.siteId)?.name : null),
    [pickup?.siteId, sites]
  )

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

  const getActionLabel = (a: WorkflowAction): string => {
    const labels: Record<WorkflowAction, string> = {
      submit: 'Submitted',
      send_to_lab: 'Sent to Lab',
      approve_results: 'Results Approved',
      archive: 'Archived',
      reject: 'Rejected',
    }
    return labels[a] ?? a
  }

  const handleWorkflowAction = (action: WorkflowAction) => {
    if (!pickup || !id) return
    const nextStatus = getNextState(pickup.status ?? 'Pending', action, role)
    if (!nextStatus) {
      toast.error('Invalid transition')
      return
    }
    const fromState = pickup.status ?? 'Pending'
    updateMutation.mutate(
      {
        id,
        updates: { status: nextStatus },
        auditMetadata: {
          fromState,
          toState: nextStatus,
          action: getActionLabel(action),
        },
      },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${nextStatus}`)
          refetch()
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to update')
        },
      }
    )
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusBadgeVariant(pickup.status ?? 'Pending')}>
            {pickup.status}
          </Badge>
          {allowedActions.length > 0 && (
            <div className="flex gap-1">
              {allowedActions.includes('submit') && (
                <Button
                  size="sm"
                  onClick={() => handleWorkflowAction('submit')}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Submit
                </Button>
              )}
              {allowedActions.includes('send_to_lab') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWorkflowAction('send_to_lab')}
                  disabled={updateMutation.isPending}
                >
                  Submit for Lab
                </Button>
              )}
              {allowedActions.includes('approve_results') && (
                <Button
                  size="sm"
                  onClick={() => handleWorkflowAction('approve_results')}
                  disabled={updateMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve Results
                </Button>
              )}
              {allowedActions.includes('archive') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWorkflowAction('archive')}
                  disabled={updateMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              )}
              {allowedActions.includes('reject') && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleWorkflowAction('reject')}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              )}
            </div>
          )}
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
          <CardTitle className="font-mono">
            {pickup.sampleId ?? pickup.vialId ?? pickup.id.slice(0, 12)}
          </CardTitle>
          <CardDescription>
            {pickup.pickupLocationName ?? pickup.location ?? siteName ?? `Sample ${pickup.vialId}`} ·{' '}
            {format(new Date(pickup.timestamp), 'MMM d, yyyy HH:mm')}
            {pickup.vialCount != null && pickup.vialCount > 1 && ` · ${pickup.vialCount} vials`}
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
                <p className="text-sm text-muted-foreground">Chlorine (ppm)</p>
                <p className="text-xl font-semibold">
                  {(pickup.chlorineReading ?? pickup.chlorine) != null
                    ? String(pickup.chlorineReading ?? pickup.chlorine)
                    : '—'}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Volume</p>
              <p className="text-muted-foreground">{pickup.volume} mL</p>
            </div>
            {siteName && (
              <div>
                <p className="text-sm font-medium">Site</p>
                <p className="text-muted-foreground">{siteName}</p>
              </div>
            )}
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
            <CardDescription>
              Click to view full size
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {displayPhotos.map((ph) => {
                const src = ph.serverUrl ?? ph.localUri
                return (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => setLightboxPhoto(src)}
                    className="block rounded-lg border overflow-hidden transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="View photo full size"
                  >
                    <img
                      src={src}
                      alt="Sample"
                      className="h-24 w-24 object-cover"
                    />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(lightboxPhoto)} onOpenChange={(o) => !o && setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="sr-only">Photo</DialogTitle>
          </DialogHeader>
          <div className="relative p-4 pt-2">
            {lightboxPhoto && (
              <img
                src={lightboxPhoto}
                alt="Sample full size"
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-6 top-6 rounded-full"
              onClick={() => setLightboxPhoto(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    <Badge variant={getStatusBadgeVariant(entry.status)}>
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
                  {(entry.fromState != null || entry.toState != null) && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.fromState && entry.toState
                        ? `${entry.fromState} → ${entry.toState}`
                        : entry.toState
                          ? `→ ${entry.toState}`
                          : entry.fromState
                            ? `${entry.fromState} →`
                            : null}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                  )}
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
