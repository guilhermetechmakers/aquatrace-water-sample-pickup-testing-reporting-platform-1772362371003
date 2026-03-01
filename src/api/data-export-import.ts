/**
 * Data Export & Import API
 * Uses Supabase client and Edge Functions for export/import operations
 */

import { supabase } from '@/lib/supabase'
import type {
  DataExportType,
  DataImportType,
  ExportFormat,
  ExportFilters,
  ImportTemplate,
  ImportPreviewRow,
  ImportJob,
  ExportJob,
  AuditLogEntry,
} from '@/types/data-export-import'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function rowToExportJob(row: Record<string, unknown>): ExportJob {
  return {
    id: (row.id as string) ?? '',
    jobId: (row.id as string) ?? '',
    status: (row.status as ExportJob['status']) ?? 'queued',
    progress: typeof row.progress === 'number' ? row.progress : parseInt(String(row.progress ?? 0), 10) || 0,
    totalRows: typeof row.total_rows === 'number' ? row.total_rows : parseInt(String(row.total_rows ?? 0), 10) || 0,
    downloadUrl: (row.download_url as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    dataType: (row.data_type as ExportJob['dataType']) ?? 'samples',
    format: (row.format as ExportJob['format']) ?? 'csv',
    createdAt: (row.created_at as string) ?? '',
    completedAt: (row.completed_at as string) ?? null,
  }
}

function rowToImportJob(row: Record<string, unknown>): ImportJob {
  const errors = (row.validation_errors as unknown[]) ?? []
  return {
    id: (row.id as string) ?? '',
    status: (row.status as ImportJob['status']) ?? 'pending',
    totalRows: typeof row.total_rows === 'number' ? row.total_rows : parseInt(String(row.total_rows ?? 0), 10) || 0,
    importedRows: typeof row.imported_rows === 'number' ? row.imported_rows : parseInt(String(row.imported_rows ?? 0), 10) || 0,
    failedRows: typeof row.failed_rows === 'number' ? row.failed_rows : parseInt(String(row.failed_rows ?? 0), 10) || 0,
    validationErrors: Array.isArray(errors) ? errors as ImportJob['validationErrors'] : [],
    dataType: (row.data_type as ImportJob['dataType']) ?? 'samples',
    createdAt: (row.created_at as string) ?? '',
    completedAt: (row.completed_at as string) ?? null,
  }
}

/** Initiate export job via Edge Function */
export async function initiateExport(params: {
  dataType: DataExportType
  format?: ExportFormat
  scope?: 'all' | 'per_customer' | 'per_site'
  filters?: ExportFilters
}): Promise<{
  jobId: string
  status: string
  progress?: number
  totalRows?: number
  downloadUrl?: string
  expiresAt?: string
}> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await supabase.functions.invoke('data-export', {
    body: {
      dataType: params.dataType,
      format: params.format ?? 'csv',
      scope: params.scope ?? 'all',
      filters: params.filters ?? {},
    },
  })

  if (error) throw new Error(error.message ?? 'Export failed')
  const payload = data as Record<string, unknown>
  if (payload?.error) throw new Error(String(payload.error))

  return {
    jobId: String(payload?.jobId ?? ''),
    status: String(payload?.status ?? 'queued'),
    progress: typeof payload?.progress === 'number' ? payload.progress : undefined,
    totalRows: typeof payload?.totalRows === 'number' ? payload.totalRows : undefined,
    downloadUrl: payload?.downloadUrl ? String(payload.downloadUrl) : undefined,
    expiresAt: payload?.expiresAt ? String(payload.expiresAt) : undefined,
  }
}

/** Fetch export job status from Supabase table */
export async function fetchExportJobStatus(jobId: string): Promise<ExportJob | null> {
  if (!isSupabaseConfigured() || !jobId) return null

  const { data, error } = await supabase
    .from('data_export_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (error || !data) return null
  return rowToExportJob(data as Record<string, unknown>)
}

/** List export jobs for current user */
export async function fetchExportJobs(limit = 20): Promise<ExportJob[]> {
  if (!isSupabaseConfigured()) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []

  const { data: rows, error } = await supabase
    .from('data_export_jobs')
    .select('*')
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const list = rows ?? []
  return Array.isArray(list) ? list.map((r) => rowToExportJob(r as Record<string, unknown>)) : []
}

/** Get download URL for completed export */
export async function getExportDownloadUrl(jobId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !jobId) return null

  const job = await fetchExportJobStatus(jobId)
  if (!job || job.status !== 'completed') return null
  if (job.downloadUrl) return job.downloadUrl

  return null
}

/** Get import template for data type */
export async function getImportTemplate(type: DataImportType): Promise<ImportTemplate> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token ?? ''

  const res = await fetch(
    `${supabaseUrl}/functions/v1/data-import-template?type=${encodeURIComponent(type)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const payload = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(String(payload?.error ?? 'Failed to fetch template'))

  const fields = Array.isArray(payload?.fields) ? payload.fields : []
  return {
    type: (payload?.type as DataImportType) ?? type,
    fields: fields as ImportTemplate['fields'],
    headerRow: String(payload?.headerRow ?? ''),
    exampleRow: String(payload?.exampleRow ?? ''),
  }
}

/** Download template as CSV */
export function downloadTemplateCsv(headerRow: string, exampleRow: string, type: DataImportType): void {
  const csv = [headerRow, exampleRow].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aquatrace-${type}-template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Validate CSV import - creates job with preview, returns jobId and preview rows */
export async function validateImportCsv(
  file: File,
  type: DataImportType
): Promise<{
  jobId: string
  status: string
  previewRows: ImportPreviewRow[]
  validCount: number
  invalidCount: number
  totalRows: number
  headers: string[]
}> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const content = await file.text()
  const { data, error } = await supabase.functions.invoke('data-import-validate', {
    body: { dataType: type, csvContent: content, fileName: file.name },
  })

  if (error) throw new Error(error.message ?? 'Validation failed')
  const payload = data as Record<string, unknown>

  const previewData = (payload?.previewData as ImportPreviewRow[]) ?? []
  const validCount = typeof payload?.validRows === 'number' ? payload.validRows : previewData.filter((r) => r.valid).length
  const invalidCount = typeof payload?.invalidRows === 'number' ? payload.invalidRows : previewData.filter((r) => !r.valid).length
  const headers = previewData[0] ? Object.keys(previewData[0].data ?? {}) : []

  return {
    jobId: String(payload?.jobId ?? ''),
    status: String(payload?.status ?? 'preview'),
    previewRows: previewData,
    validCount,
    invalidCount,
    totalRows: typeof payload?.totalRows === 'number' ? payload.totalRows : previewData.length,
    headers,
  }
}

/** Commit import (process valid rows from file) */
export async function commitImport(
  file: File,
  type: DataImportType
): Promise<{
  jobId: string
  status: string
  imported: number
  failed: number
  totalRows: number
  errors: Array<{ row: number; errors: string[] }>
}> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const { data: session } = await supabase.auth.getSession()
  const token = session.session?.access_token ?? ''
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

  const res = await fetch(`${supabaseUrl}/functions/v1/data-import-commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const payload = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(String(payload?.error ?? 'Import failed'))

  const errors = Array.isArray(payload?.errors) ? payload.errors : []
  return {
    jobId: String(payload?.jobId ?? ''),
    status: String(payload?.status ?? 'completed'),
    imported: typeof payload?.imported === 'number' ? payload.imported : 0,
    failed: typeof payload?.failed === 'number' ? payload.failed : 0,
    totalRows: typeof payload?.totalRows === 'number' ? payload.totalRows : 0,
    errors: errors as Array<{ row: number; errors: string[] }>,
  }
}

/** Fetch import job status */
export async function fetchImportJobStatus(jobId: string): Promise<ImportJob | null> {
  if (!isSupabaseConfigured() || !jobId) return null

  const { data, error } = await supabase
    .from('data_import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (error || !data) return null
  return rowToImportJob(data as Record<string, unknown>)
}

/** Fetch import job with preview data */
export async function fetchImportJobWithPreview(jobId: string): Promise<{
  job: ImportJob
  previewRows: ImportPreviewRow[]
} | null> {
  if (!isSupabaseConfigured() || !jobId) return null

  const { data, error } = await supabase
    .from('data_import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as Record<string, unknown>
  const previewData = (row.preview_data as ImportPreviewRow[]) ?? []
  return {
    job: rowToImportJob(row),
    previewRows: Array.isArray(previewData) ? previewData : [],
  }
}

/** List import jobs for current user */
export async function fetchImportJobs(limit = 20): Promise<ImportJob[]> {
  if (!isSupabaseConfigured()) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []

  const { data: rows, error } = await supabase
    .from('data_import_jobs')
    .select('*')
    .eq('uploaded_by', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  const list = rows ?? []
  return Array.isArray(list) ? list.map((r) => rowToImportJob(r as Record<string, unknown>)) : []
}

/** Fetch audit logs */
export async function fetchAuditLogs(params?: {
  from?: string
  to?: string
  action?: string
  dataType?: string
  page?: number
  pageSize?: number
}): Promise<{ data: AuditLogEntry[]; count: number }> {
  if (!isSupabaseConfigured()) return { data: [], count: 0 }

  let q = supabase
    .from('data_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (params?.from) q = q.gte('created_at', params.from + 'T00:00:00Z')
  if (params?.to) q = q.lte('created_at', params.to + 'T23:59:59Z')
  if (params?.action) q = q.eq('action', params.action)
  if (params?.dataType) q = q.eq('data_type', params.dataType)

  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.min(50, Math.max(10, params?.pageSize ?? 20))
  q = q.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: rows, error, count } = await q

  if (error) return { data: [], count: 0 }
  const list = rows ?? []
  const data = Array.isArray(list)
    ? list.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: (row.id as string) ?? '',
          user_id: (row.user_id as string) ?? null,
          action: (row.action as string) ?? '',
          data_type: (row.data_type as string) ?? '',
          status: (row.status as string) ?? '',
          metadata: (row.metadata as Record<string, unknown>) ?? {},
          error_message: (row.error_message as string) ?? null,
          created_at: (row.created_at as string) ?? '',
        } as AuditLogEntry
      })
    : []

  return { data, count: count ?? data.length }
}
