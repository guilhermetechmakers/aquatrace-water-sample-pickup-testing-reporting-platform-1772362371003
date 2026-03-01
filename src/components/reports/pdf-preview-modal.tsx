/**
 * PDFPreviewModal - In-page rendering of generated PDF (embedded viewer or downloadable link)
 */

import { Download, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface PDFPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl?: string | null
  reportId?: string
  version?: number
  isLoading?: boolean
}

export function PDFPreviewModal({
  open,
  onOpenChange,
  pdfUrl,
  reportId,
  version,
  isLoading = false,
}: PDFPreviewModalProps) {
  const hasUrl = Boolean(pdfUrl && pdfUrl.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              Report PDF {reportId ? `· ${reportId}` : ''} {version ? `v${version}` : ''}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {hasUrl && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfUrl ?? '#'} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={pdfUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open in new tab
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : hasUrl ? (
            <iframe
              src={pdfUrl ?? ''}
              title="PDF Report"
              className="w-full h-[70vh] rounded-lg border bg-muted"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No PDF available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a report from the Approval Details page to view the PDF.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
