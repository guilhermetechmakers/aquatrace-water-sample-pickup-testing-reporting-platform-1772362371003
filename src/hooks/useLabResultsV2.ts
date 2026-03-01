/**
 * React Query hooks for Lab Results Entry & Validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as api from '@/api/lab-results-v2'
import type { CreateResultInput, UpdateResultInput } from '@/types/lab-results'

const QUEUED_KEY = ['lab-queued-samples'] as const
const RESULT_KEY = ['lab-result'] as const
const THRESHOLDS_KEY = ['lab-thresholds'] as const

export function useQueuedSamples(params?: { siteId?: string; status?: string }) {
  return useQuery({
    queryKey: [...QUEUED_KEY, params?.siteId ?? '', params?.status ?? ''],
    queryFn: () => api.fetchQueuedSamples(params),
  })
}

export function useResultBySampleId(sampleId: string | null) {
  return useQuery({
    queryKey: [...RESULT_KEY, sampleId ?? ''],
    queryFn: () => (sampleId ? api.fetchResultBySampleId(sampleId) : Promise.resolve(null)),
    enabled: Boolean(sampleId),
  })
}

export function useResultWithDetails(resultId: string | null) {
  return useQuery({
    queryKey: [...RESULT_KEY, 'details', resultId ?? ''],
    queryFn: () => (resultId ? api.fetchResultWithDetails(resultId) : Promise.resolve({ data: null, versions: [], attachments: [] })),
    enabled: Boolean(resultId),
  })
}

export function useCreateResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: CreateResultInput) =>
      api.createResult(input, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUED_KEY })
      queryClient.invalidateQueries({ queryKey: RESULT_KEY })
    },
  })
}

export function useUpdateResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ resultId, input }: { resultId: string; input: UpdateResultInput }) =>
      api.updateResult(resultId, input, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUED_KEY })
      queryClient.invalidateQueries({ queryKey: RESULT_KEY })
    },
  })
}

export function useRevertResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ resultId, toVersion }: { resultId: string; toVersion: number; note?: string }) =>
      api.revertResult(resultId, toVersion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESULT_KEY })
    },
  })
}

export function useUploadAttachment() {
  const queryClient = useQueryClient()

  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ resultId, file }: { resultId: string; file: File }) =>
      api.uploadAttachment(resultId, file, user?.id),
    onSuccess: (_, { resultId }) => {
      queryClient.invalidateQueries({ queryKey: [...RESULT_KEY, 'details', resultId] })
    },
  })
}

export function useThresholds(customerId?: string | null, siteId?: string | null) {
  return useQuery({
    queryKey: [...THRESHOLDS_KEY, customerId ?? '', siteId ?? ''],
    queryFn: () => api.fetchThresholds(customerId, siteId),
  })
}

export function useSaveThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: Parameters<typeof api.saveThreshold>[0]) =>
      api.saveThreshold(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THRESHOLDS_KEY })
    },
  })
}
