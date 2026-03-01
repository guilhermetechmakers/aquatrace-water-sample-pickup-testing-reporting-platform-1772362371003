/**
 * Lab Results Validation - Client-side and shared validation logic
 * Numeric ranges, units, detection methods per threshold config
 */

import { z } from 'zod'
import type { ThresholdConfig } from '@/types/lab-results'

const numericSchema = z.union([
  z.number().finite(),
  z.string().transform((s) => {
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }),
  z.null(),
]).nullable()

export const labResultFormSchema = z.object({
  sampleId: z.string().min(1, 'Sample is required'),
  spcValue: numericSchema,
  spcUnit: z.string().nullable(),
  totalColiformValue: numericSchema,
  totalColiformUnit: z.string().nullable(),
  method: z.string().nullable(),
  note: z.string().max(500).nullable(),
}).refine(
  (data) => {
    const spc = data.spcValue
    const tc = data.totalColiformValue
    return (spc != null && Number.isFinite(spc)) || (tc != null && Number.isFinite(tc))
  },
  { message: 'At least one of SPC or Total Coliform must be entered', path: ['spcValue'] }
)

export type LabResultFormValues = z.infer<typeof labResultFormSchema>

const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const MAX_ATTACHMENT_SIZE_MB = 50

export function validateAttachment(file: File): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024)
  if (sizeMB > MAX_ATTACHMENT_SIZE_MB) {
    return { valid: false, error: `File size exceeds ${MAX_ATTACHMENT_SIZE_MB}MB limit` }
  }
  const isAllowed = ALLOWED_ATTACHMENT_TYPES.some((t) =>
    t.endsWith('/*') ? file.type.startsWith(t.replace('/*', '')) : file.type === t
  ) || file.type.startsWith('image/')
  if (!isAllowed) {
    return {
      valid: false,
      error: 'File type not allowed. Use PDF, CSV, XLSX, or images.',
    }
  }
  return { valid: true }
}

export function validateAgainstThreshold(
  spcValue: number | null,
  spcUnit: string | null,
  tcValue: number | null,
  tcUnit: string | null,
  config: ThresholdConfig | null
): { valid: boolean; flags: string[] } {
  const flags: string[] = []
  if (!config) return { valid: true, flags }

  if (spcValue != null && typeof spcValue === 'number' && Number.isFinite(spcValue)) {
    if (config.spcMin != null && spcValue < config.spcMin) {
      flags.push('out_of_range')
    }
    if (config.spcMax != null && spcValue > config.spcMax) {
      flags.push('out_of_range')
    }
    if (spcUnit && config.spcUnit && spcUnit !== config.spcUnit) {
      flags.push('unit_mismatch')
    }
  }

  if (tcValue != null && typeof tcValue === 'number' && Number.isFinite(tcValue)) {
    if (config.tcMin != null && tcValue < config.tcMin) {
      flags.push('out_of_range')
    }
    if (config.tcMax != null && tcValue > config.tcMax) {
      flags.push('out_of_range')
    }
    if (tcUnit && config.tcUnit && tcUnit !== config.tcUnit) {
      flags.push('unit_mismatch')
    }
  }

  return {
    valid: flags.length === 0,
    flags: [...new Set(flags)],
  }
}

export function parseNumericInput(value: string): number | null {
  if (value === '' || value == null) return null
  const n = parseFloat(String(value).trim())
  return Number.isFinite(n) ? n : null
}
