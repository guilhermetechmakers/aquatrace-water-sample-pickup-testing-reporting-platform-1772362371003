/**
 * DrillDownModal - Detailed view for KPI or alert
 * Uses design tokens, empty/loading/error states, and accessibility best practices.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FileQuestion, RefreshCw } from 'lucide-react'
import type { SLAAlert } from '@/types/analytics'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface DrillDownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  alert?: SLAAlert | null
  children?: React.ReactNode
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyStateMessage?: string
  emptyStateActionLabel?: string
  onEmptyStateAction?: () => void
}

/** Map severity to Badge variant using design tokens */
function getSeverityVariant(
  severity: SLAAlert['severity']
): 'destructive' | 'warning' | 'success' | 'secondary' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive'
    case 'medium':
      return 'warning'
    case 'low':
      return 'success'
    default:
      return 'secondary'
  }
}

export function DrillDownModal({
  open,
  onOpenChange,
  title = 'Details',
  description,
  alert,
  children,
  isLoading = false,
  error = null,
  onRetry,
  emptyStateMessage = 'No details available for this item.',
  emptyStateActionLabel = 'Close',
  onEmptyStateAction,
}: DrillDownModalProps) {
  const hasContent = Boolean(children || alert)
  const hasError = Boolean(error)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby="drill-down-title"
        aria-describedby={description ? 'drill-down-description' : undefined}
        aria-label={title}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle id="drill-down-title" className="text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription id="drill-down-description" className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div
          role="region"
          aria-label="Drill-down content"
          className="min-h-[120px] py-4"
        >
          {isLoading ? (
            <div className="space-y-4 animate-fade-in" aria-busy="true" aria-live="polite">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md bg-muted" />
                <Skeleton className="h-5 w-full rounded-md bg-muted" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded-md bg-muted" />
                <Skeleton className="h-5 w-3/4 rounded-md bg-muted" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 rounded-md bg-muted" />
                <Skeleton className="h-6 w-20 rounded-full bg-muted" />
              </div>
            </div>
          ) : hasError ? (
            <div
              className="flex flex-col items-center justify-center gap-4 py-8 text-center animate-fade-in"
              role="alert"
              aria-live="assertive"
            >
              <div className="rounded-full bg-destructive/10 p-4" aria-hidden>
                <RefreshCw className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Unable to load details</p>
                <p className="text-sm text-muted-foreground max-w-[240px]">{error}</p>
              </div>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  aria-label="Retry loading details"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Retry
                </Button>
              )}
            </div>
          ) : hasContent ? (
            <>
              {children}
              {alert && !children && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground" id="field-workflow">
                      Workflow stage
                    </p>
                    <p className="text-sm text-foreground" aria-labelledby="field-workflow">
                      {alert.workflowStage.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground" id="field-breach">
                      Breach time
                    </p>
                    <p className="text-sm text-foreground" aria-labelledby="field-breach">
                      {format(new Date(alert.breachTime), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground" id="field-severity">
                      Severity
                    </p>
                    <Badge
                      variant={getSeverityVariant(alert.severity)}
                      className="mt-1 capitalize"
                      aria-labelledby="field-severity"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  {alert.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground" id="field-notes">
                        Notes
                      </p>
                      <p className="text-sm text-foreground mt-1" aria-labelledby="field-notes">
                        {alert.notes}
                      </p>
                    </div>
                  )}
                  {Array.isArray(alert.affectedOrderIds) &&
                    alert.affectedOrderIds.length > 0 && (
                      <div>
                        <p
                          className="text-sm font-medium text-muted-foreground"
                          id="field-orders"
                        >
                          Affected orders
                        </p>
                        <p
                          className="text-sm font-mono text-foreground mt-1 break-all"
                          aria-labelledby="field-orders"
                        >
                          {alert.affectedOrderIds.join(', ')}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-4 py-8 text-center animate-fade-in"
              role="status"
              aria-live="polite"
            >
              <div
                className="rounded-full bg-muted p-4"
                aria-hidden
              >
                <FileQuestion className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">No details to display</p>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  {emptyStateMessage}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  onEmptyStateAction?.()
                  if (!onEmptyStateAction) onOpenChange(false)
                }}
                className={cn(
                  'gap-2 transition-transform',
                  'hover:scale-[1.02] active:scale-[0.98]'
                )}
                aria-label={onEmptyStateAction ? emptyStateActionLabel : 'Close modal'}
              >
                {emptyStateActionLabel}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
