/**
 * SLA Heatmap - SLA compliance by customer (or lab/technician)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  className?: string
}

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
  className,
}: SLAHeatmapProps) {
  const rows = Array.isArray(data) ? data : []
  const hasData = rows.length > 0

  return (
    <Card className={cn('transition-all hover:shadow-card-hover', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No data for selected period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                title={`${row.compliance}% compliance${row.total != null ? ` (${row.onTime ?? 0}/${row.total})` : ''}`}
              >
                <span className="w-32 truncate text-sm font-medium" title={row.label}>
                  {row.label}
                </span>
                <div className="flex-1 h-6 rounded-md bg-muted overflow-hidden flex">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 min-w-[2px]',
                      getComplianceColor(row.compliance)
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, row.compliance))}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm text-muted-foreground">
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
