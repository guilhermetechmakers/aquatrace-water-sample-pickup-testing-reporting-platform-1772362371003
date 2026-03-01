/**
 * Lab Results Entry & Validation - Type definitions
 * SPC (Standard Plate Count) and Total Coliform results with versioning and thresholds
 */

export interface LabSample {
  id: string
  customerId: string | null
  siteId: string | null
  collectionDate: string
  status: string
  createdAt: string
  updatedAt: string
  /** Extended from pickup */
  location?: string
  customerName?: string
  siteName?: string
}

export interface LabResultEntry {
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
  status: 'draft' | 'validated' | 'flagged' | 'approved' | 'pending' | 'rejected'
  flags: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ResultVersion {
  id: string
  resultId: string
  version: number
  dataSnapshot: Record<string, unknown>
  changedBy: string | null
  changedAt: string
  note: string | null
}

export interface ResultAttachment {
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

export interface CSVImportJob {
  id: string
  uploadedBy: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: number
  successRows: number
  failedRows: number
  errors: Array<{ row: number; message: string }>
  createdAt: string
  completedAt: string | null
}

export type CreateResultInput = {
  sampleId: string
  spcValue: number | null
  spcUnit: string | null
  totalColiformValue: number | null
  totalColiformUnit: string | null
  method: string | null
  attachments?: Array<{ fileName: string; mimeType: string; size: number; storagePath: string }>
}

export type UpdateResultInput = {
  spcValue?: number | null
  spcUnit?: string | null
  totalColiformValue?: number | null
  totalColiformUnit?: string | null
  method?: string | null
  note?: string | null
  attachments?: Array<{ fileName: string; mimeType: string; size: number; storagePath: string }>
}

export const SPC_UNITS = ['CFU/mL', 'CFU/g', 'CFU/100mL'] as const
export const TC_UNITS = ['CFU/100mL', 'CFU/mL', 'MPN/100mL'] as const
export const DETECTION_METHODS = [
  'Standard Plate Count',
  'Membrane Filtration',
  'Pour Plate',
  'Spread Plate',
  'Colilert',
  'Other',
] as const
