/**
 * Attachments API - File upload & secure storage
 * Uses Supabase Edge Functions for signed URLs and Supabase client for direct operations.
 */

import { supabase } from '@/lib/supabase'
import type {
  Attachment,
  SignedUrlResponse,
  ConfirmUploadPayload,
  ConfirmUploadResponse,
  DownloadUrlResponse,
  ListAttachmentsParams,
  ListAttachmentsResponse,
} from '@/types/attachments'

async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} })
  if (error) throw new Error(error.message ?? 'Request failed')
  const result = data as T & { error?: string }
  if (result?.error) throw new Error(result.error)
  return result as T
}

export async function requestSignedUploadUrl(params: {
  relatedEntityType: string
  relatedEntityId: string
  fileName: string
  mimeType: string
  fileSize: number
  attachmentType?: string
}): Promise<SignedUrlResponse> {
  return invokeFunction<SignedUrlResponse>('attachments-signed-url', params)
}

export async function confirmUpload(payload: ConfirmUploadPayload): Promise<ConfirmUploadResponse> {
  return invokeFunction<ConfirmUploadResponse>('attachments-confirm', payload as unknown as Record<string, unknown>)
}

export async function getDownloadUrl(
  attachmentId: string,
  expiresIn = 3600
): Promise<DownloadUrlResponse> {
  return invokeFunction<DownloadUrlResponse>('attachments-download-url', {
    attachmentId,
    expiresIn,
  })
}

export async function deleteAttachment(attachmentId: string): Promise<{ attachmentId: string; message: string }> {
  return invokeFunction<{ attachmentId: string; message: string }>('attachments-delete', {
    attachmentId,
  })
}

export async function listAttachments(
  params: ListAttachmentsParams
): Promise<ListAttachmentsResponse> {
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0

  const { data, error, count } = await supabase
    .from('attachments')
    .select('*', { count: 'exact' })
    .eq('related_entity_type', params.relatedEntityType)
    .eq('related_entity_id', params.relatedEntityId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error

  const rows = data ?? []
  const attachments: Attachment[] = (Array.isArray(rows) ? rows : []).map((r: Record<string, unknown>) => ({
    id: String(r.id ?? ''),
    s3Key: String(r.s3_key ?? r.storage_key ?? ''),
    fileName: String(r.file_name ?? ''),
    mimeType: String(r.mime_type ?? ''),
    size: Number(r.size ?? 0),
    checksum: (r.checksum as string) ?? null,
    uploadedAt: String(r.uploaded_at ?? ''),
    uploadedByUserId: (r.uploaded_by_user_id as string) ?? null,
    relatedEntityType: r.related_entity_type as Attachment['relatedEntityType'],
    relatedEntityId: String(r.related_entity_id ?? ''),
    accessControl: (r.access_control as Record<string, unknown>) ?? {},
    expirationDate: (r.expiration_date as string) ?? null,
    scanStatus: (r.scan_status as Attachment['scanStatus']) ?? 'pending',
    scanResult: (r.scan_result as Record<string, unknown>) ?? null,
    isArchived: Boolean(r.is_archived),
    isDeleted: Boolean(r.is_deleted),
    attachmentType: String(r.attachment_type ?? 'general'),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }))

  return {
    attachments,
    total: typeof count === 'number' ? count : (rows ?? []).length,
  }
}

export async function uploadFileDirect(params: {
  relatedEntityType: string
  relatedEntityId: string
  file: File
  attachmentType?: string
  onProgress?: (percent: number) => void
}): Promise<Attachment> {
  const { relatedEntityType, relatedEntityId, file, attachmentType = 'general', onProgress } = params

  const signed = await requestSignedUploadUrl({
    relatedEntityType,
    relatedEntityId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    attachmentType,
  })

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const xhr = new XMLHttpRequest()
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
      })

      xhr.open('PUT', signed.signedUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)

      await uploadPromise
      lastError = null
      break
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      } else {
        throw lastError
      }
    }
  }

  let checksum: string | undefined
  try {
    const buf = await file.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buf)
    checksum = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    // Checksum optional; continue without
  }
  await confirmUpload({ attachmentId: signed.attachmentId, checksum })

  const { data: att } = await supabase
    .from('attachments')
    .select('*')
    .eq('id', signed.attachmentId)
    .single()

  const r = att as Record<string, unknown> | null
  if (!r) throw new Error('Attachment not found after upload')

  return {
    id: String(r.id ?? ''),
    s3Key: String(r.s3_key ?? r.storage_key ?? ''),
    fileName: String(r.file_name ?? ''),
    mimeType: String(r.mime_type ?? ''),
    size: Number(r.size ?? 0),
    checksum: (r.checksum as string) ?? null,
    uploadedAt: String(r.uploaded_at ?? ''),
    uploadedByUserId: (r.uploaded_by_user_id as string) ?? null,
    relatedEntityType: r.related_entity_type as Attachment['relatedEntityType'],
    relatedEntityId: String(r.related_entity_id ?? ''),
    accessControl: (r.access_control as Record<string, unknown>) ?? {},
    expirationDate: (r.expiration_date as string) ?? null,
    scanStatus: (r.scan_status as Attachment['scanStatus']) ?? 'clean',
    scanResult: (r.scan_result as Record<string, unknown>) ?? null,
    isArchived: Boolean(r.is_archived),
    isDeleted: Boolean(r.is_deleted),
    attachmentType: String(r.attachment_type ?? 'general'),
    createdAt: String(r.created_at ?? ''),
    updatedAt: String(r.updated_at ?? ''),
  }
}
