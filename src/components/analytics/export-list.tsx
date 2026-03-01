/**
 * ExportList - list of analytics exports with status
 */

import { FileText, FileSpreadsheet, Download, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { AnalyticsExport } from '@/types/analytics'
import { cn } from '@/lib/utils'

export interface ExportListProps {
  exports: AnalyticsExport[]
  isLoading?: boolean
  error?: Error | null
}

const STATUS_VARIANTS: Record<AnalyticsExport['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
}

const ICON_SIZE = 'h-4 w-4'

export function ExportList({ exports: exportList, isLoading = false, error = null }: ExportListProps) {
  const list = Array.isArray(exportList) ? exportList : []

  return (
    <Card className="rounded-lg shadow-card transition-all duration-200 hover:shadow-card-hover">
      <CardHeader>
        <CardTitle>Recent Exports</CardTitle>
        <CardDescription>
          On-demand and scheduled report exports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-border bg-muted/10"
            role="alert"
          >
            <div className="rounded-full bg-destructive/10 p-4 mb-4" aria-hidden>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="font-medium text-foreground">Failed to load exports</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-border bg-muted/10">
            <div className="rounded-full bg-muted/50 p-4 mb-4" aria-hidden>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No exports yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create an export from the Export button above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((exp) => (
              <div
                key={exp.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-border p-3 transition-all duration-200',
                  'sm:flex-row sm:items-center sm:justify-between',
                  'hover:shadow-sm hover:border-primary/20'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {exp.type === 'pdf' ? (
                    <FileText className={cn(ICON_SIZE, 'shrink-0 text-muted-foreground')} aria-hidden />
                  ) : (
                    <FileSpreadsheet className={cn(ICON_SIZE, 'shrink-0 text-muted-foreground')} aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {exp.type.toUpperCase()} Export
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(exp.createdAt), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={STATUS_VARIANTS[exp.status] ?? 'outline'}>
                    {exp.status}
                  </Badge>
                  {exp.status === 'completed' && exp.fileUrl && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                      asChild
                    >
                      <a
                        href={exp.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Download ${exp.type.toUpperCase()} export from ${format(new Date(exp.createdAt), 'MMM d, yyyy')}`}
                      >
                        <Download className={cn(ICON_SIZE, 'mr-1 inline')} aria-hidden />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
