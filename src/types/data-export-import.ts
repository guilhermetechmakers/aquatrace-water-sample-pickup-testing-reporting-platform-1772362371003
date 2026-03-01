/**
 * Data Export & Import types
 */

export type DataExportType = 'samples' | 'results' | 'invoices' | 'all'
export type DataImportType = 'samples' | 'results' | 'invoices' | 'customers'
export type ExportFormat = 'csv' | 'json'
export type ExportScope = 'all' | 'per_customer' | 'per_site'

export type ExportJobStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type ImportJobStatus = 'pending' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed'

export interface ExportJob {
  id: string
  jobId: string
  status: ExportJobStatus
  progress: number
  totalRows: number
  downloadUrl: string | null
  expiresAt: string | null
  errorMessage: string | null
  dataType: DataExportType
  format: ExportFormat
  createdAt: string
  completedAt: string | null
}

export interface ImportJob {
  id: string
  status: ImportJobStatus
  totalRows: number
  importedRows: number
  failedRows: number
  validationErrors: Array<{ row: number; field?: string; message: string }>
  dataType: DataImportType
  createdAt: string
  completedAt: string | null
  previewData?: ImportPreviewRow[]
}

export interface ImportPreviewRow {
  rowIndex: number
  valid: boolean
  errors: string[]
  data: Record<string, unknown>
}

export interface TemplateField {
  name: string
  required: boolean
  type: string
  example: string
}

export interface ImportTemplate {
  type: DataImportType
  fields: TemplateField[]
  headerRow?: string
  exampleRow?: string
  templateUrl?: string
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  data_type: string
  status: string
  metadata?: Record<string, unknown> | null
  error_message?: string | null
  created_at: string
}

export interface ExportFilters {
  dateFrom?: string
  dateTo?: string
  customerId?: string
  status?: string
}
