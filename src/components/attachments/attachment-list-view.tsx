/**
 * AttachmentListView - List attachments for a given entity
 * Thumbnail previews for images, file type icons, size, date, status badges.
 * Actions: view (expiring signed URL), download, delete (with permissions).
 */

import { useState, useCallback } from 'react'
import {
  FileText,
  Image,
  FileSpreadsheet,
  Download,
  Trash2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { useAttachments, useDownloadAttachment, useDeleteAttachment } from '@/hooks/useAttachments'
import { getDownloadUrl } from '@/api/attachments'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import { cn } from '@/lib/utils'
import type { Attachment, AttachmentScanStatus, RelatedEntityType } from '@/types/attachments'

function getFileIcon(mimeType: string) {
  const t = (mimeType ?? '').toLowerCase()
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return Image
  if (t.includes('sheet') || t.includes('csv') || t.includes('excel')) return FileSpreadsheet
  return FileText
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function ScanStatusBadge({ status }: { status: AttachmentScanStatus }) {
  const config: Record<AttachmentScanStatus, { icon: typeof ShieldCheck; label: string; className: string }> = {
    pending: { icon: Clock, label: 'Pending', className: 'bg-muted text-muted-foreground' },
    scanning: { icon: Loader2, label: 'Scanning', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    clean: { icon: ShieldCheck, label: 'Clean', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    infected: { icon: ShieldAlert, label: 'Infected', className: 'bg-destructive/10 text-destructive' },
    failed: { icon: ShieldAlert, label: 'Failed', className: 'bg-destructive/10 text-destructive' },
  }
  const { icon: Icon, label, className } = config[status] ?? config.pending
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {status === 'scanning' ? (
        <Icon className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </span>
  )
}

export interface AttachmentListViewProps {
  relatedEntityType: RelatedEntityType
  relatedEntityId: string
  className?: string
  showDelete?: boolean
  emptyMessage?: string
}

function isImageMime(mime: string): boolean {
  const t = (mime ?? '').toLowerCase()
  return t.startsWith('image/') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('webp') || t.includes('gif')
}

function ImageThumbnail({ attachmentId, mimeType, className }: { attachmentId: string; mimeType: string; className?: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['attachment-preview', attachmentId],
    queryFn: () => getDownloadUrl(attachmentId, 3600).then((r) => r.downloadUrl),
    enabled: isImageMime(mimeType),
    staleTime: 1000 * 60 * 30,
  })
  if (!isImageMime(mimeType)) return null
  if (isLoading || !url) {
    return (
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted', className)}>
        <Image className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      className={cn('h-10 w-10 shrink-0 rounded-lg object-cover border', className)}
    />
  )
}

export function AttachmentListView({
  relatedEntityType,
  relatedEntityId,
  className,
  showDelete = false,
  emptyMessage = 'No attachments',
}: AttachmentListViewProps) {
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const { data, isLoading, error } = useAttachments({
    relatedEntityType,
    relatedEntityId,
  })
  const downloadMutation = useDownloadAttachment()
  const deleteMutation = useDeleteAttachment()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  const attachments = Array.isArray(data?.attachments) ? (data?.attachments ?? []) : []
  const safeAttachments = attachments ?? []

  const handleDownload = useCallback(
    async (att: Attachment) => {
      setLoadingId(att.id)
      try {
        const { downloadUrl } = await downloadMutation.mutateAsync({
          attachmentId: att.id,
          expiresIn: 3600,
        })
        window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to get download link')
      } finally {
        setLoadingId(null)
      }
    },
    [downloadMutation]
  )

  const handleView = useCallback(
    async (att: Attachment) => {
      if (att.scanStatus === 'infected') return
      setLoadingId(att.id)
      try {
        const { downloadUrl } = await downloadMutation.mutateAsync({
          attachmentId: att.id,
          expiresIn: 3600,
        })
        if (isImageMime(att.mimeType ?? '')) {
          setPreviewUrl(downloadUrl)
          setPreviewAttachment(att)
        } else {
          window.open(downloadUrl, '_blank', 'noopener,noreferrer')
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to open')
      } finally {
        setLoadingId(null)
      }
    },
    [downloadMutation]
  )

  const handleDelete = useCallback(
    async (att: Attachment) => {
      setDeletingId(att.id)
      try {
        await deleteMutation.mutateAsync(att.id)
        toast.success('Attachment deleted')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete')
      } finally {
        setDeletingId(null)
      }
    },
    [deleteMutation]
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive', className)}>
        Failed to load attachments
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
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-2', className)} role="list" aria-label="Attachments">
        {(safeAttachments ?? []).map((att) => {
          const Icon = getFileIcon(att.mimeType ?? '')
          const isLoading = loadingId === att.id
          const isDeleting = deletingId === att.id
          const isImage = isImageMime(att.mimeType ?? '')
          return (
            <div
              key={att.id}
              className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-muted/50 hover:shadow-sm"
              role="listitem"
            >
              {isImage ? (
                <ImageThumbnail attachmentId={att.id} mimeType={att.mimeType ?? ''} />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{att.fileName ?? '—'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatSize(att.size ?? 0)} · {formatDate(att.uploadedAt ?? '')}
                  </span>
                  <ScanStatusBadge status={att.scanStatus ?? 'pending'} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleView(att)}
                    disabled={isLoading || att.scanStatus === 'infected'}
                    aria-label="View"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleDownload(att)}
                  disabled={isLoading || att.scanStatus === 'infected'}
                  aria-label="Download"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                {showDelete && (user?.id === att.uploadedByUserId || hasPermission('attachments', 'delete')) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(att)}
                    disabled={isDeleting || att.scanStatus === 'infected'}
                    aria-label="Delete"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={Boolean(previewUrl)} onOpenChange={(o) => !o && (setPreviewUrl(null), setPreviewAttachment(null))}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="truncate pr-8">
              {previewAttachment?.fileName ?? 'Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="relative p-4 pt-2">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewAttachment?.fileName ?? 'Attachment preview'}
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
