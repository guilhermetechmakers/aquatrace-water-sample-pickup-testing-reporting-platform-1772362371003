/**
 * Data Export & Import React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/api/data-export-import'
import type {
  DataExportType,
  DataImportType,
  ExportFormat,
  ExportScope,
  ExportFilters,
} from '@/types/data-export-import'

const EXPORT_JOBS_KEY = ['data-export-jobs'] as const
const AUDIT_LOGS_KEY = ['data-audit-logs'] as const

export function useExportJobs(limit = 20) {
  return useQuery({
    queryKey: [...EXPORT_JOBS_KEY, limit],
    queryFn: () => api.fetchExportJobs(limit),
  })
}

export function useExportJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: [...EXPORT_JOBS_KEY, 'status', jobId ?? ''],
    queryFn: () => (jobId ? api.fetchExportJobStatus(jobId) : Promise.reject(new Error('No jobId'))),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'processing' ? 2000 : false
    },
  })
}

export function useInitiateExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      dataType: DataExportType
      format?: ExportFormat
      scope?: ExportScope
      filters?: ExportFilters
    }) => api.initiateExport(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPORT_JOBS_KEY })
    },
  })
}

export function useImportTemplate(type: DataImportType | null) {
  return useQuery({
    queryKey: ['data-import-template', type ?? ''],
    queryFn: () => (type ? api.getImportTemplate(type) : Promise.reject(new Error('No type'))),
    enabled: Boolean(type),
  })
}

export function useValidateImport() {
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: DataImportType }) =>
      api.validateImportCsv(file, type),
  })
}

export function useCommitImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: DataImportType }) =>
      api.commitImport(file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUDIT_LOGS_KEY })
    },
  })
}

export function useAuditLogs(params?: {
  from?: string
  to?: string
  action?: string
  dataType?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: [...AUDIT_LOGS_KEY, params ?? {}],
    queryFn: () => api.fetchAuditLogs(params),
  })
}
