/**
 * JobStatusCard - Shows export/import job status, progress, ETA, logs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Download, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface JobStatusCardProps {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  totalRows?: number
  downloadUrl?: string | null
  expiresAt?: string | null
  errorMessage?: string | null
  dataType?: string
  format?: string
  createdAt?: string
  completedAt?: string | null
  onDownload?: () => void
  isLoading?: boolean
}

export function JobStatusCard({
  jobId,
  status,
  progress = 0,
  totalRows = 0,
  downloadUrl,
  errorMessage,
  dataType,
  format: fmt,
  createdAt,
  onDownload,
  isLoading = false,
}: JobStatusCardProps) {
  const statusConfig = {
    queued: { label: 'Queued', variant: 'secondary' as const, icon: Loader2 },
    processing: { label: 'Processing', variant: 'default' as const, icon: Loader2 },
    completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
    failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
  }
  const config = statusConfig[status] ?? statusConfig.queued

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Export {jobId.slice(0, 8)}...
          </CardTitle>
          <Badge
            variant={config.variant}
            className={cn(
              'flex items-center gap-1',
              (status === 'queued' || status === 'processing') && 'animate-pulse'
            )}
          >
            {status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'completed' && <CheckCircle className="h-3 w-3" />}
            {status === 'failed' && <XCircle className="h-3 w-3" />}
            {config.label}
          </Badge>
        </div>
        {dataType && (
          <p className="text-sm text-muted-foreground">
            {dataType} • {fmt ?? 'csv'}
            {totalRows > 0 && ` • ${totalRows} rows`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {(status === 'queued' || status === 'processing') && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Checking status...' : `${progress}% complete`}
            </p>
          </div>
        )}
        {status === 'failed' && errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {status === 'completed' && downloadUrl && (
          <Button
            size="sm"
            onClick={onDownload}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        {createdAt && (
          <p className="text-xs text-muted-foreground">
            Started {format(new Date(createdAt), 'PPp')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
