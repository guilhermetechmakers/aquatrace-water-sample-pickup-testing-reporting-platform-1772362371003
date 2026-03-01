/**
 * SLA Heatmap - SLA compliance by customer (or lab/technician)
 */

import { BarChart3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface SLAHeatmapRow {
  label: string
  compliance: number
  total?: number
  onTime?: number
}

export interface SLAHeatmapProps {
  title: string
  description?: string
  data: SLAHeatmapRow[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onEmptyStateAction?: () => void
  emptyStateActionLabel?: string
  className?: string
}

/** Compliance bar colors using design tokens (theme CSS variables) */
function getComplianceColor(pct: number): string {
  if (pct >= 95) return 'bg-success'
  if (pct >= 80) return 'bg-success/70'
  if (pct >= 60) return 'bg-warning'
  return 'bg-destructive'
}

export function SLAHeatmap({
  title,
  description,
  data,
  isLoading = false,
  error = null,
  onRetry,
  onEmptyStateAction,
  emptyStateActionLabel = 'Try different filters',
  className,
}: SLAHeatmapProps) {
  const rows = Array.isArray(data) ? data : []
  const hasData = rows.length > 0
  const hasError = Boolean(error)

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-card-hover', className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
        {description && (
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4 animate-fade-in">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center animate-fade-in">
            <div className="rounded-full bg-destructive/10 p-4">
              <RefreshCw className="h-10 w-10 text-destructive" aria-hidden />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Unable to load data</p>
              <p className="text-sm text-muted-foreground max-w-[240px]">{error}</p>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center animate-fade-in">
            <div className="rounded-full bg-muted p-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground" aria-hidden />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">No data for selected period</p>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Adjust your date range or filters to see SLA compliance data.
              </p>
            </div>
            {(onEmptyStateAction ?? onRetry) && (
              <Button
                variant="default"
                size="sm"
                onClick={onEmptyStateAction ?? onRetry}
                className="gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                {onEmptyStateAction ? (
                  emptyStateActionLabel
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {(rows ?? []).map((row, i) => (
              <div
                key={`${row.label}-${i}`}
                className="flex items-center gap-3 min-h-[44px]"
                title={`${row.compliance}% compliance${row.total != null ? ` (${row.onTime ?? 0}/${row.total})` : ''}`}
              >
                <span className="w-24 sm:w-32 truncate text-sm font-medium text-foreground" title={row.label}>
                  {row.label}
                </span>
                <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden flex min-w-0">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 min-w-[2px]',
                      getComplianceColor(row.compliance)
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, row.compliance))}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-muted-foreground">
                  {row.compliance}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
