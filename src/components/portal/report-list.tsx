/**
 * ReportList - Data grid with pagination, server-side filtering, per-row actions
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Download,
  Eye,
  Share2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShareLinkDialog } from './share-link-dialog'
import { ReissueRequestModal } from './reissue-request-modal'
import { format } from 'date-fns'

export interface ReportListItem {
  id: string
  report_id?: string
  customer_id?: string
  status?: string
  created_at?: string
  pdf_link?: string | null
  pickup?: { location?: string; sampleId?: string } | null
  version?: number
}

export interface ReportListProps {
  reports: ReportListItem[]
  count: number
  isLoading?: boolean
  page?: number
  limit?: number
  onPageChange?: (page: number) => void
  onFiltersChange?: (filters: Record<string, unknown>) => void
  /** Called when user clicks View (for audit logging) */
  onViewReport?: (reportId: string) => void
}

export function ReportList({
  reports = [],
  count,
  isLoading = false,
  page = 1,
  limit = 20,
  onPageChange,
  onViewReport,
}: ReportListProps) {
  const [shareTarget, setShareTarget] = useState<{ type: 'report' | 'invoice'; id: string; reportId?: string } | null>(null)
  const [reissueTarget, setReissueTarget] = useState<{ id: string; reportId?: string } | null>(null)

  const safeReports = Array.isArray(reports) ? reports : []
  const totalPages = Math.max(1, Math.ceil(count / limit))

  const handleDownload = (r: ReportListItem) => {
    if (r.pdf_link) {
      window.open(r.pdf_link, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Report</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Location</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (safeReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No reports available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your water test reports will appear here once they are approved and distributed.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Reports list">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium">Report</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Location</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {safeReports.map((r) => (
                <tr
                  key={r.id}
                  className="border-b transition-colors hover:bg-muted/30"
                >
                  <td className="p-4">
                    <Link
                      to={`/portal/reports/${r.id}`}
                      className="font-mono text-sm font-medium text-primary hover:underline"
                    >
                      {r.report_id ?? r.id.slice(0, 12)}
                    </Link>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {r.pickup?.location ?? '—'}
                  </td>
                  <td className="p-4 text-sm">
                    {r.created_at ? format(new Date(r.created_at), 'PP') : '—'}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        r.status === 'approved' || r.status === 'distributed'
                          ? 'approved'
                          : r.status === 'draft'
                            ? 'pending'
                            : 'outline'
                      }
                    >
                      {r.status ?? '—'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8"
                      >
                        <Link
                          to={`/portal/reports/${r.id}`}
                          onClick={() => onViewReport?.(r.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => handleDownload(r)}
                        disabled={!r.pdf_link}
                        aria-label="Download PDF"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setShareTarget({ type: 'report', id: r.id, reportId: r.report_id })}
                        aria-label="Share link"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setReissueTarget({ id: r.id, reportId: r.report_id })}
                        aria-label="Request reissue"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reissue
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({count} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {shareTarget && (
        <ShareLinkDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          targetType={shareTarget.type}
          targetId={shareTarget.id}
          reportId={shareTarget.reportId}
        />
      )}

      {reissueTarget && (
        <ReissueRequestModal
          open={!!reissueTarget}
          onOpenChange={(open) => !open && setReissueTarget(null)}
          reportId={reissueTarget.id}
          reportDisplayId={reissueTarget.reportId}
        />
      )}
    </>
  )
}
