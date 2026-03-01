/**
 * ExportList - list of analytics exports with status
 */

import { FileText, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import type { AnalyticsExport } from '@/types/analytics'

export interface ExportListProps {
  exports: AnalyticsExport[]
  isLoading?: boolean
}

const STATUS_VARIANTS: Record<AnalyticsExport['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
}

export function ExportList({ exports: exportList, isLoading = false }: ExportListProps) {
  const list = Array.isArray(exportList) ? exportList : []

  return (
    <Card className="transition-all hover:shadow-card-hover">
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
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No exports yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create an export from the Export button above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {exp.type === 'pdf' ? (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {exp.type.toUpperCase()} Export
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(exp.createdAt), 'MMM d, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[exp.status] ?? 'outline'}>
                    {exp.status}
                  </Badge>
                  {exp.status === 'completed' && exp.fileUrl && (
                    <a
                      href={exp.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      Download
                    </a>
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
