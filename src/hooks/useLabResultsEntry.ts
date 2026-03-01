/**
 * Lab Results Entry - React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as labEntryApi from '@/api/lab-results-entry'
import type { CreateResultInput, UpdateResultInput } from '@/types/lab-results-entry'
import type { CreateThresholdInput } from '@/api/lab-results-entry'

const QUEUED_KEY = ['lab-queued-samples'] as const
const RESULT_KEY = ['lab-result-entry'] as const
const THRESHOLDS_KEY = ['lab-thresholds'] as const
const CSV_JOBS_KEY = ['lab-csv-import-jobs'] as const

export function useQueuedSamples(filters?: {
  siteId?: string
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
}) {
  return useQuery({
    queryKey: [...QUEUED_KEY, filters ?? {}],
    queryFn: () => labEntryApi.fetchQueuedSamples(filters),
  })
}

export function useResultBySampleId(sampleId: string | null) {
  return useQuery({
    queryKey: [...RESULT_KEY, sampleId ?? ''],
    queryFn: () => (sampleId ? labEntryApi.fetchResultBySampleId(sampleId) : Promise.resolve(null)),
    enabled: Boolean(sampleId),
  })
}

export function useResultWithDetails(resultId: string | null) {
  return useQuery({
    queryKey: [...RESULT_KEY, 'details', resultId ?? ''],
    queryFn: () => (resultId ? labEntryApi.fetchResultWithDetails(resultId) : Promise.resolve({ result: null, versions: [], attachments: [] })),
    enabled: Boolean(resultId),
  })
}

export function useCreateResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: CreateResultInput) =>
      labEntryApi.createResult(input, user?.id ?? ''),
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
    mutationFn: ({
      resultId,
      input,
    }: {
      resultId: string
      input: UpdateResultInput
    }) => labEntryApi.updateResult(resultId, input, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUED_KEY })
      queryClient.invalidateQueries({ queryKey: RESULT_KEY })
    },
  })
}

export function useRevertResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      resultId,
      toVersion,
      note,
    }: {
      resultId: string
      toVersion: number
      note: string | null
    }) => labEntryApi.revertResult(resultId, toVersion, note, user?.id ?? ''),
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
      labEntryApi.uploadAttachment(resultId, file, user?.id ?? ''),
    onSuccess: (_, { resultId }) => {
      queryClient.invalidateQueries({ queryKey: [...RESULT_KEY, 'details', resultId] })
    },
  })
}

export function useThresholds(customerId?: string, siteId?: string) {
  return useQuery({
    queryKey: [...THRESHOLDS_KEY, customerId ?? '', siteId ?? ''],
    queryFn: () => labEntryApi.fetchThresholds(customerId, siteId),
  })
}

export function useAllThresholds() {
  return useQuery({
    queryKey: [...THRESHOLDS_KEY, 'all'],
    queryFn: () => labEntryApi.fetchAllThresholds(),
  })
}

export function useCreateThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateThresholdInput) => labEntryApi.createThreshold(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THRESHOLDS_KEY })
    },
  })
}

export function useUpdateThreshold() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<CreateThresholdInput>
    }) => labEntryApi.updateThreshold(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THRESHOLDS_KEY })
    },
  })
}

export function useCSVImportPreview() {
  return useMutation({
    mutationFn: ({
      file,
      mappings,
    }: {
      file: File
      mappings: Record<string, string>
    }) => labEntryApi.previewCSVImport(file, mappings),
  })
}

export function useCSVImportJob() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      file,
      mappings,
    }: {
      file: File
      mappings: Record<string, string>
    }) => labEntryApi.createCSVImportJob(file, mappings, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CSV_JOBS_KEY })
      queryClient.invalidateQueries({ queryKey: QUEUED_KEY })
      queryClient.invalidateQueries({ queryKey: RESULT_KEY })
    },
  })
}

export function useCSVImportJobs() {
  return useQuery({
    queryKey: CSV_JOBS_KEY,
    queryFn: () => labEntryApi.fetchCSVImportJobs(),
  })
}
