/**
 * React Query hooks for attachments (file upload & secure storage)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAttachments,
  uploadFileDirect,
  getDownloadUrl,
  deleteAttachment,
} from '@/api/attachments'
import type { ListAttachmentsParams, RelatedEntityType } from '@/types/attachments'

const QUERY_KEY = ['attachments'] as const

export function useAttachments(params: ListAttachmentsParams | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, params?.relatedEntityType ?? '', params?.relatedEntityId ?? ''],
    queryFn: () => listAttachments(params!),
    enabled: Boolean(params?.relatedEntityType && params?.relatedEntityId),
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      relatedEntityType: RelatedEntityType
      relatedEntityId: string
      file: File
      attachmentType?: string
      onProgress?: (percent: number) => void
    }) => uploadFileDirect(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, variables.relatedEntityType, variables.relatedEntityId],
      })
    },
  })
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: (params: { attachmentId: string; expiresIn?: number }) =>
      getDownloadUrl(params.attachmentId, params.expiresIn),
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
