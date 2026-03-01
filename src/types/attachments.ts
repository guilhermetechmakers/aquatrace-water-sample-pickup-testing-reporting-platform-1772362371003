/**
 * File Upload & Secure Storage - Type definitions
 */

export type AttachmentScanStatus = 'pending' | 'scanning' | 'clean' | 'infected' | 'failed'

export type RelatedEntityType = 'pickup' | 'sample' | 'lab_result' | 'report' | 'invoice'

export interface Attachment {
  id: string
  s3Key: string
  fileName: string
  mimeType: string
  size: number
  checksum: string | null
  uploadedAt: string
  uploadedByUserId: string | null
  relatedEntityType: RelatedEntityType
  relatedEntityId: string
  accessControl: Record<string, unknown>
  expirationDate: string | null
  scanStatus: AttachmentScanStatus
  scanResult: Record<string, unknown> | null
  isArchived: boolean
  isDeleted: boolean
  attachmentType: string
  createdAt: string
  updatedAt: string
}

export interface SignedUrlResponse {
  attachmentId: string
  signedUrl: string
  path: string
  token: string | null
  expiresAt: string
}

export interface ConfirmUploadPayload {
  attachmentId: string
  checksum?: string
}

export interface ConfirmUploadResponse {
  attachmentId: string
  scanStatus: AttachmentScanStatus
  message: string
}

export interface DownloadUrlResponse {
  downloadUrl: string
  expiresAt: string
  expiresIn: number
}

export interface ListAttachmentsParams {
  relatedEntityType: RelatedEntityType
  relatedEntityId: string
  limit?: number
  offset?: number
}

export interface ListAttachmentsResponse {
  attachments: Attachment[]
  total: number
}
