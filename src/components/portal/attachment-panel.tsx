/**
 * AttachmentPanel - List of raw files with download/preview for portal
 */

import { FileText, Image, FileSpreadsheet, Download } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReportAttachment } from '@/types/reports'

export interface AttachmentPanelProps {
  attachments: ReportAttachment[]
  onDownload?: (attachment: ReportAttachment) => void
  isLoading?: boolean
  className?: string
}

function getFileIcon(fileType: string) {
  const type = (fileType ?? '').toLowerCase()
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    return Image
  }
  if (type.includes('sheet') || type.includes('csv') || type.includes('excel')) {
    return FileSpreadsheet
  }
  return FileText
}

export function AttachmentPanel({
  attachments,
  onDownload,
  isLoading = false,
  className,
}: AttachmentPanelProps) {
  const safeAttachments = Array.isArray(attachments) ? attachments : []

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (safeAttachments.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center',
          className
        )}
      >
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">No attachments</p>
        <p className="text-xs text-muted-foreground mt-1">Supporting files will appear here</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)} role="list" aria-label="Report attachments">
      {safeAttachments.map((att) => {
        const Icon = getFileIcon(att.fileType ?? '')
        const url = att.url ?? att.storagePath ?? '#'
        return (
          <a
            key={att.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-muted/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={(e) => {
              if (onDownload && !att.url) {
                e.preventDefault()
                onDownload(att)
              }
            }}
            role="listitem"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{att.filename ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{att.fileType ?? '—'}</p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        )
      })}
    </div>
  )
}
