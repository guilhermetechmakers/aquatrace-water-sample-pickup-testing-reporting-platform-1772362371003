/**
 * ExportDashboard - List/export controls with format, scope, date filters, status badges
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FileDown, Loader2 } from 'lucide-react'
import { useInitiateExport, useExportJobs, useExportJobStatus } from '@/hooks/useDataExportImport'
import { getExportDownloadUrl } from '@/api/data-export-import'
import { JobStatusCard, type JobStatusCardProps } from './job-status-card'
import type { DataExportType, ExportFormat } from '@/types/data-export-import'
import { subDays, format } from 'date-fns'
import { toast } from 'sonner'

const DATA_TYPES: { value: DataExportType; label: string }[] = [
  { value: 'samples', label: 'Samples' },
  { value: 'results', label: 'Lab Results' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'all', label: 'All Data' },
]

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
]

export interface ExportDashboardProps {
  defaultDataType?: DataExportType | ''
}

export function ExportDashboard({ defaultDataType = 'samples' }: ExportDashboardProps) {
  const [dataType, setDataType] = useState<DataExportType>(
    defaultDataType && ['samples', 'results', 'invoices', 'all'].includes(defaultDataType)
      ? (defaultDataType as DataExportType)
      : 'samples'
  )
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [recentJobId, setRecentJobId] = useState<string | null>(null)

  const initiateExport = useInitiateExport()
  const { data: jobs = [], isLoading: jobsLoading } = useExportJobs(30)
  const { data: jobStatusData, isLoading: statusLoading } = useExportJobStatus(recentJobId)

  const handleExport = () => {
    initiateExport.mutate(
      {
        dataType,
        format: exportFormat,
        filters: { dateFrom, dateTo },
      },
      {
        onSuccess: (res) => {
          setRecentJobId(res.jobId)
          if (res.downloadUrl) {
            window.open(res.downloadUrl, '_blank')
            toast.success(`Exported ${res.totalRows ?? 0} rows`)
          } else {
            toast.success('Export started')
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Export failed'),
      }
    )
  }

  const handleDownload = async (jobId: string) => {
    try {
      const url = await getExportDownloadUrl(jobId)
      if (url) {
        window.open(url, '_blank')
        toast.success('Download started')
      } else {
        toast.error('Could not generate download link')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Choose dataset type, format, and date range. Large exports run in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Data Type</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as DataExportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleExport}
            disabled={initiateExport.isPending}
          >
            {initiateExport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Start Export
          </Button>
        </CardContent>
      </Card>

      {recentJobId && jobStatusData && (
        <JobStatusCard
          jobId={recentJobId}
          status={jobStatusData.status as JobStatusCardProps['status']}
          progress={jobStatusData.progress}
          totalRows={jobStatusData.totalRows}
          downloadUrl={jobStatusData.downloadUrl}
          errorMessage={jobStatusData.errorMessage}
          createdAt={jobStatusData.createdAt}
          dataType={jobStatusData.dataType}
          format={jobStatusData.format}
          onDownload={() => recentJobId && handleDownload(recentJobId)}
          isLoading={statusLoading}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>Your last 30 export jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (jobs ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No exports yet</p>
          ) : (
            <div className="space-y-2">
              {(jobs ?? []).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{j.dataType} • {j.format}</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(j.createdAt), 'PPp')} • {j.totalRows ?? 0} rows
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        j.status === 'completed'
                          ? 'text-success'
                          : j.status === 'failed'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {j.status}
                    </span>
                    {j.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(j.id)}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
