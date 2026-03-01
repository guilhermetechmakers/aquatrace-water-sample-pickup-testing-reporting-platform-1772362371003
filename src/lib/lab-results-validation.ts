/**
 * Lab Results Entry - Validation utilities
 * Client-side validation for SPC and Total Coliform values
 */

import type { ThresholdConfig } from '@/types/lab-results-entry'

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  flags: string[]
}

export function validateNumericValue(
  value: number | null | undefined,
  field: string,
  min?: number | null,
  max?: number | null
): ValidationError | null {
  if (value == null) return null
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return { field, message: `${field} must be a valid number`, severity: 'error' }
  }
  if (min != null && num < min) {
    return { field, message: `${field} is below minimum (${min})`, severity: 'error' }
  }
  if (max != null && num > max) {
    return { field, message: `${field} exceeds maximum (${max})`, severity: 'error' }
  }
  return null
}

export function validateResultAgainstThreshold(
  spcValue: number | null,
  spcUnit: string | null,
  totalColiformValue: number | null,
  totalColiformUnit: string | null,
  threshold: ThresholdConfig | null
): ValidationResult {
  const errors: ValidationError[] = []
  const flags: string[] = []

  if (!threshold) {
    return { valid: true, errors: [], flags: [] }
  }

  if (spcValue != null && Number.isFinite(spcValue)) {
    const spcErr = validateNumericValue(spcValue, 'SPC', threshold.spcMin ?? undefined, threshold.spcMax ?? undefined)
    if (spcErr) {
      errors.push(spcErr)
      flags.push('out_of_range')
    }
    if (spcUnit && threshold.spcUnit && spcUnit !== threshold.spcUnit) {
      errors.push({
        field: 'spcUnit',
        message: `Unit mismatch: expected ${threshold.spcUnit}`,
        severity: 'warning',
      })
      flags.push('unit_mismatch')
    }
  }

  if (totalColiformValue != null && Number.isFinite(totalColiformValue)) {
    const tcErr = validateNumericValue(
      totalColiformValue,
      'Total Coliform',
      threshold.tcMin ?? undefined,
      threshold.tcMax ?? undefined
    )
    if (tcErr) {
      errors.push(tcErr)
      if (!flags.includes('out_of_range')) flags.push('out_of_range')
    }
    if (totalColiformUnit && threshold.tcUnit && totalColiformUnit !== threshold.tcUnit) {
      errors.push({
        field: 'totalColiformUnit',
        message: `Unit mismatch: expected ${threshold.tcUnit}`,
        severity: 'warning',
      })
      if (!flags.includes('unit_mismatch')) flags.push('unit_mismatch')
    }
  }

  const hasErrors = errors.some((e) => e.severity === 'error')
  return {
    valid: !hasErrors,
    errors,
    flags: [...new Set(flags)],
  }
}

export function validateAttachment(file: File): ValidationError | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      field: 'attachment',
      message: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
      severity: 'error',
    }
  }
  const allowed = ALLOWED_MIME_TYPES.some(
    (m) => file.type === m || (m.startsWith('image/') && file.type.startsWith('image/'))
  )
  if (!allowed) {
    return {
      field: 'attachment',
      message: 'File type not allowed. Use PDF, CSV, XLSX, or images.',
      severity: 'error',
    }
  }
  return null
}

export function parseNumericInput(value: string): number | null {
  if (value.trim() === '') return null
  const num = parseFloat(value)
  return Number.isFinite(num) ? num : null
}
