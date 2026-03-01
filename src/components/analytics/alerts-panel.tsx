/**
 * AlertsPanel - SLA alerts list with acknowledge/resolve
 */

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { SLAAlert } from '@/types/analytics'
import { useAcknowledgeSLAAlert, useResolveSLAAlert } from '@/hooks/useAnalytics'

export interface AlertsPanelProps {
  alerts: SLAAlert[]
  isLoading?: boolean
  onStatusFilter?: (status: string) => void
  statusFilter?: string
  maxItems?: number
}

export function AlertsPanel({
  alerts,
  isLoading = false,
  statusFilter = 'open',
  onStatusFilter,
  maxItems = 10,
}: AlertsPanelProps) {
  const [notesModal, setNotesModal] = useState<{
    alert: SLAAlert
    action: 'acknowledge' | 'resolve'
  } | null>(null)
  const [notes, setNotes] = useState('')

  const acknowledgeMutation = useAcknowledgeSLAAlert()
  const resolveMutation = useResolveSLAAlert()

  const list = Array.isArray(alerts) ? alerts.slice(0, maxItems) : []

  const handleAcknowledge = () => {
    if (!notesModal) return
    acknowledgeMutation.mutate(
      { alertId: notesModal.alert.id, notes },
      {
        onSuccess: () => {
          toast.success('Alert acknowledged')
          setNotesModal(null)
          setNotes('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      }
    )
  }

  const handleResolve = () => {
    if (!notesModal) return
    resolveMutation.mutate(
      { alertId: notesModal.alert.id, notes },
      {
        onSuccess: () => {
          toast.success('Alert resolved')
          setNotesModal(null)
          setNotes('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      }
    )
  }

  return (
    <>
      <Card className="transition-all hover:shadow-card-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle>SLA Alerts</CardTitle>
            </div>
            {onStatusFilter && (
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => onStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            )}
          </div>
          <CardDescription>
            Proactive alerts for missed SLAs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-success/50 mb-4" />
              <p className="text-muted-foreground">No alerts</p>
              <p className="text-sm text-muted-foreground mt-1">
                All SLAs are on track
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'capitalize',
                          alert.severity === 'critical' && 'border-destructive text-destructive',
                          alert.severity === 'high' && 'border-destructive/50 text-destructive'
                        )}
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {alert.customerName ?? alert.workflowStage}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.workflowStage} · {format(new Date(alert.breachTime), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline">{alert.status}</Badge>
                    {(alert.status === 'open' || alert.status === 'acknowledged') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setNotesModal({
                              alert,
                              action: 'acknowledge',
                            })
                          }
                        >
                          Ack
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setNotesModal({
                              alert,
                              action: 'resolve',
                            })
                          }
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={notesModal != null}
        onOpenChange={(o) => !o && setNotesModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notesModal?.action === 'acknowledge'
                ? 'Acknowledge Alert'
                : 'Resolve Alert'}
            </DialogTitle>
            <DialogDescription>
              Add notes (optional) for this {notesModal?.action}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={
                notesModal?.action === 'acknowledge'
                  ? handleAcknowledge
                  : handleResolve
              }
              disabled={
                notesModal?.action === 'acknowledge'
                  ? acknowledgeMutation.isPending
                  : resolveMutation.isPending
              }
            >
              {(notesModal?.action === 'acknowledge'
                ? acknowledgeMutation.isPending
                : resolveMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                notesModal?.action === 'acknowledge'
                  ? 'Acknowledge'
                  : 'Resolve'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
