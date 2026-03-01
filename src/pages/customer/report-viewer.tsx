/**
 * Report PDF Viewer / Download Page - page_014
 * Preview, attachments, download, reissue, share link
 * Print-friendly, mobile-responsive, accessible
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Download,
  Share2,
  RefreshCw,
  ArrowLeft,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenantData } from '@/hooks/usePortal'
import { fetchPortalReports } from '@/api/portal'
import { fetchReportAttachments } from '@/api/portal'
import { AttachmentPanel } from '@/components/portal'
import type { ReportAttachment } from '@/types/reports'
import { ShareLinkDialog } from '@/components/portal/share-link-dialog'
import { ReissueRequestModal } from '@/components/portal/reissue-request-modal'
import { format } from 'date-fns'
import { toast } from 'sonner'

export function ReportViewerPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { data: customerId } = useTenantData()
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [reissueOpen, setReissueOpen] = useState(false)
  const [pdfScale, setPdfScale] = useState(100)

  useEffect(() => {
    if (!reportId || !customerId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    const cid: string | null = customerId ?? null
    const rid = reportId!

    async function load() {
      setIsLoading(true)
      try {
        const { reports } = await fetchPortalReports(cid, { limit: 100 })
        const list = reports ?? []
        const found = Array.isArray(list) ? list.find((r: Record<string, unknown>) => (r.id as string) === rid) : null

        if (cancelled) return

        if (found) {
          setReport(found as Record<string, unknown>)
          const url = (found as { pdf_link?: string | null }).pdf_link
          setPdfUrl(url ?? null)

          const atts = await fetchReportAttachments(rid, cid)
          setAttachments(Array.isArray(atts) ? atts : [])
        } else {
          setReport(null)
        }
      } catch {
        if (!cancelled) {
          toast.error('Failed to load report')
          setReport(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [reportId, customerId ?? null])

  const handleDownload = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank')
      toast.success('Download started')
    } else {
      toast.error('PDF not available')
    }
  }, [pdfUrl])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const zoomIn = () => setPdfScale((s) => Math.min(150, s + 10))
  const zoomOut = () => setPdfScale((s) => Math.max(50, s - 10))
  const zoomReset = () => setPdfScale(100)

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[60vh] w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium">Report not found</p>
        <p className="text-sm text-muted-foreground mt-1">
          This report may not exist or you may not have access to it.
        </p>
        <Button asChild className="mt-6">
          <Link to="/portal">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
      </div>
    )
  }

  const reportDisplayId = (report.report_id as string) ?? reportId
  const pickup = report.pickup as { location?: string } | null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/portal" aria-label="Back to reports">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Report {reportDisplayId}
            </h1>
            <p className="text-sm text-muted-foreground">
              {pickup?.location ?? '—'} ·{' '}
              {report.created_at
                ? format(new Date(report.created_at as string), 'PP')
                : '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownload} disabled={!pdfUrl} aria-label="Download PDF">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => setShareOpen(true)} aria-label="Generate share link">
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" onClick={() => setReissueOpen(true)} aria-label="Request reissue">
            <RefreshCw className="h-4 w-4 mr-2" />
            Request Reissue
          </Button>
          <Button variant="outline" onClick={handlePrint} aria-label="Print">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          {pdfUrl && (
            <div className="flex items-center gap-2 print:hidden" role="toolbar" aria-label="PDF controls">
              <Button variant="outline" size="sm" onClick={zoomOut} aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem] text-center" aria-live="polite">
                {pdfScale}%
              </span>
              <Button variant="outline" size="sm" onClick={zoomIn} aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomReset} aria-label="Reset zoom">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} aria-label="Print">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {pdfUrl ? (
                <div
                  className="overflow-auto print:overflow-visible"
                  style={{ maxHeight: '70vh' }}
                  role="region"
                  aria-label="PDF document viewer"
                >
                  <div
                    style={{
                      transform: `scale(${pdfScale / 100})`,
                      transformOrigin: 'top left',
                      width: `${100 / (pdfScale / 100)}%`,
                      height: '500px',
                    }}
                  >
                    <iframe
                      src={pdfUrl}
                      title="Report PDF - Water test results document"
                      className="w-full h-full min-h-[400px] border-0 print:scale-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">PDF not yet available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The report PDF will appear here once it has been generated.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <AttachmentPanel attachments={attachments} />
            </CardContent>
          </Card>
        </div>
      </div>

      {shareOpen && reportId && (
        <ShareLinkDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          targetType="report"
          targetId={reportId}
          reportId={reportDisplayId}
        />
      )}

      {reissueOpen && reportId && (
        <ReissueRequestModal
          open={reissueOpen}
          onOpenChange={setReissueOpen}
          reportId={reportId}
          reportDisplayId={reportDisplayId}
        />
      )}
    </div>
  )
}
