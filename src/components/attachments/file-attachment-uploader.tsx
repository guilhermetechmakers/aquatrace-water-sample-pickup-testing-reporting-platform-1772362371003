/**
 * FileAttachmentUploader - Reusable file upload component
 * Direct-to-storage uploads via signed URLs, progress indicators, retry on failure.
 */

import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { useUploadAttachment } from '@/hooks/useAttachments'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { cn } from '@/lib/utils'
import type { RelatedEntityType } from '@/types/attachments'

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface FileAttachmentUploaderProps {
  relatedEntityType: RelatedEntityType
  relatedEntityId: string
  allowedTypes?: string[]
  maxSize?: number
  onUploadComplete?: (attachmentId: string) => void
  className?: string
  disabled?: boolean
}

export function FileAttachmentUploader({
  relatedEntityType,
  relatedEntityId,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  onUploadComplete,
  className,
  disabled = false,
}: FileAttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const uploadMutation = useUploadAttachment()

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File too large. Max ${formatSize(maxSize)}`
      }
      const allowed = allowedTypes ?? DEFAULT_ALLOWED_TYPES
      const type = file.type || 'application/octet-stream'
      if (!allowed.includes(type) && !allowed.includes('*/*')) {
        return `File type ${type} not allowed`
      }
      return null
    },
    [maxSize, allowedTypes]
  )

  const handleUpload = useCallback(
    async (file: File) => {
      const err = validateFile(file)
      if (err) {
        toast.error(err)
        return
      }

      setUploadingFiles((prev) => new Set(prev).add(file.name))
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))

      try {
        const attachment = await uploadMutation.mutateAsync({
          relatedEntityType,
          relatedEntityId,
          file,
          attachmentType: 'general',
          onProgress: (p) => setUploadProgress((prev) => ({ ...prev, [file.name]: p })),
        })
        toast.success(`${file.name} uploaded`)
        onUploadComplete?.(attachment.id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(file.name)
          return next
        })
        setUploadProgress((prev) => {
          const { [file.name]: _, ...rest } = prev
          return rest
        })
      }
    },
    [
      relatedEntityType,
      relatedEntityId,
      validateFile,
      uploadMutation,
      onUploadComplete,
    ]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length) return
      const fileList = Array.from(files)
      fileList.forEach((file) => handleUpload(file))
      e.target.value = ''
    },
    [handleUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = e.dataTransfer?.files
      if (!files?.length) return
      const fileList = Array.from(files)
      fileList.forEach((file) => handleUpload(file))
    },
    [handleUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  return (
    <PermissionGuard resource="attachments" action="create">
      <div className={cn('space-y-3', className)}>
        <input
          ref={inputRef}
          type="file"
          accept={allowedTypes.join(',')}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploadingFiles.size > 0}
          aria-label="Choose file to upload"
        />

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all duration-200',
            'hover:border-primary/50 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            dragActive && 'border-primary bg-primary/5',
            (disabled || uploadingFiles.size > 0) && 'pointer-events-none opacity-60'
          )}
          aria-label="Drop files or click to upload"
        >
          {uploadingFiles.size > 0 ? (
            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              {Array.from(uploadingFiles).map((name) => (
                <div key={name} className="flex w-full flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    <span className="truncate text-sm font-medium">{name}</span>
                  </div>
                  <Progress
                    value={uploadProgress[name] ?? 0}
                    max={100}
                    className="h-1.5 w-full"
                  />
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress[name] ?? 0}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Drop files or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, PDF, CSV up to {formatSize(maxSize)}
              </p>
            </>
          )}
        </div>
      </div>
    </PermissionGuard>
  )
}
