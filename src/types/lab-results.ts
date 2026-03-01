/**
 * Lab Results Entry & Validation - Data Models
 * SPC (Standard Plate Count) and Total Coliform results with versioning and audit
 */

export type LabSampleStatus = 'queued' | 'in_progress' | 'completed'
export type ResultStatus = 'draft' | 'validated' | 'flagged' | 'approved'
export type FlagSeverity = 'warning' | 'error'

export interface LabSample {
  id: string
  customerId: string | null
  siteId: string | null
  collectionDate: string
  status: LabSampleStatus
  customerName?: string | null
  siteName?: string | null
  onSiteStatus?: string | null
  spcResult?: number | null
  coliformResult?: number | null
  entryStatus?: string | null
  lastModified?: string | null
  createdAt: string
  updatedAt: string
}

export interface LabResult {
  id: string
  sampleId: string
  spcValue: number | null
  spcUnit: string | null
  totalColiformValue: number | null
  totalColiformUnit: string | null
  method: string | null
  enteredBy: string
  enteredAt: string
  version: number
  status: ResultStatus
  flags: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ResultVersion {
  id: string
  resultId: string
  version: number
  dataSnapshot: Record<string, unknown>
  changedBy: string
  changedAt: string
  note: string | null
}

export interface LabAttachment {
  id: string
  resultId: string
  fileName: string
  mimeType: string
  size: number
  storagePath: string
  uploadedAt: string
}

export interface ThresholdConfig {
  id: string
  customerId: string | null
  siteId: string | null
  spcMin: number | null
  spcMax: number | null
  spcUnit: string
  tcMin: number | null
  tcMax: number | null
  tcUnit: string
  allowedMethods: string[]
  effectiveFrom: string
  effectiveTo: string | null
}

export interface AuditLogEntry {
  id: string
  action: string
  userId: string | null
  sampleId: string | null
  resultId: string | null
  changes: Record<string, unknown> | null
  timestamp: string
}

export interface CSVImportJob {
  id: string
  uploadedBy: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  successRows: number
  failedRows: number
  createdAt: string
  completedAt: string | null
  errors: Array<{ row: number; message: string }>
}

export interface CreateResultInput {
  sampleId: string
  spcValue: number | null
  spcUnit: string | null
  totalColiformValue: number | null
  totalColiformUnit: string | null
  method: string | null
  attachments?: Array<{ fileName: string; mimeType: string; size: number; storagePath: string }>
}

export interface UpdateResultInput {
  spcValue?: number | null
  spcUnit?: string | null
  totalColiformValue?: number | null
  totalColiformUnit?: string | null
  method?: string | null
  note?: string | null
  attachments?: Array<{ fileName: string; mimeType: string; size: number; storagePath: string }>
}

export interface CSVImportMapping {
  csvColumn: string
  fieldName: string
}

export const SPC_UNITS = ['CFU/mL', 'CFU/100mL', 'CFU/g', 'MPN/100mL'] as const
export const DETECTION_METHODS = ['Plate Count', 'Membrane Filtration', 'Colilert', 'IDEXX', 'Other'] as const
