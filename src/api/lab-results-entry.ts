/**
 * Lab Results Entry API - Queued samples, results, versions, attachments, thresholds
 * Uses Supabase; falls back to mock when not configured
 */

import { supabase } from '@/lib/supabase'
import type {
  LabSample,
  LabResultEntry,
  ResultVersion,
  ResultAttachment,
  ThresholdConfig,
  CreateResultInput,
  UpdateResultInput,
  CSVImportJob,
} from '@/types/lab-results-entry'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// --- Queued Samples ---
export interface LabSampleWithResult extends LabSample {
  spcResult: number | null
  coliformResult: number | null
  entryStatus: 'pending' | 'draft' | 'validated' | 'flagged' | 'approved' | 'not_entered'
  resultId: string | null
  lastModified: string | null
  onSiteStatus?: string | null
}

export interface QueuedSamplesResponse {
  data: LabSampleWithResult[]
  count: number
}

function rowToLabSample(row: Record<string, unknown>): LabSample {
  const pickup = row as { id: string; customer_id?: string; site_id?: string; location?: string; completed_at?: string; status?: string; created_at?: string; updated_at?: string }
  return {
    id: pickup.id ?? '',
    customerId: (pickup.customer_id as string) ?? null,
    siteId: (pickup.site_id as string) ?? null,
    collectionDate: (pickup.completed_at ?? pickup.created_at ?? new Date().toISOString()) as string,
    status: (pickup.status as string) ?? 'queued',
    createdAt: (pickup.created_at as string) ?? '',
    updatedAt: (pickup.updated_at as string) ?? '',
    location: pickup.location ?? undefined,
    siteName: pickup.location ?? undefined,
    customerName: undefined,
  }
}

export async function fetchQueuedSamples(filters?: {
  siteId?: string
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
}): Promise<QueuedSamplesResponse> {
  if (!isSupabaseConfigured()) {
    const mock: LabSampleWithResult[] = [
      {
        id: 'p1',
        customerId: null,
        siteId: 'site-1',
        collectionDate: new Date().toISOString(),
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        location: 'Building A',
        spcResult: null,
        coliformResult: null,
        entryStatus: 'pending',
        resultId: null,
        lastModified: null,
      },
      {
        id: 'p2',
        customerId: null,
        siteId: 'site-2',
        collectionDate: new Date().toISOString(),
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        location: 'Building B',
        spcResult: 25,
        coliformResult: 0,
        entryStatus: 'draft',
        resultId: 'lr1',
        lastModified: new Date().toISOString(),
      },
    ]
    return { data: mock, count: mock.length }
  }

  let q = supabase
    .from('pickups')
    .select('id, customer_id, site_id, location, completed_at, status, created_at, updated_at')
    .in('status', ['completed', 'synced', 'in_lab', 'submitted'])
    .order('completed_at', { ascending: false })

  if (filters?.siteId) q = q.eq('site_id', filters.siteId)
  if (filters?.dueDateFrom) q = q.gte('completed_at', filters.dueDateFrom)
  if (filters?.dueDateTo) q = q.lte('completed_at', filters.dueDateTo)

  const { data: pickupData, error } = await q
  if (error) throw new Error(error.message)

  const pickups = pickupData ?? []
  const pickupIds = Array.isArray(pickups) ? pickups.map((p) => (p as { id: string }).id) : []

  let resultsMap: Record<string, { spc: number | null; total_coliform: number | null; status: string; id: string; updated_at: string }> = {}
  if (pickupIds.length > 0) {
    const { data: resultsData } = await supabase
      .from('lab_results')
      .select('id, pickup_id, spc, total_coliform, status, updated_at')
      .in('pickup_id', pickupIds)
    const results = resultsData ?? []
    for (const r of Array.isArray(results) ? results : []) {
      const row = r as { pickup_id: string; spc: number | null; total_coliform: number | null; status: string; id: string; updated_at: string }
      if (!resultsMap[row.pickup_id] || (row.updated_at > (resultsMap[row.pickup_id]?.updated_at ?? ''))) {
        resultsMap[row.pickup_id] = {
          id: row.id,
          spc: row.spc,
          total_coliform: row.total_coliform,
          status: row.status,
          updated_at: row.updated_at,
        }
      }
    }
  }

  let samples: LabSampleWithResult[] = (Array.isArray(pickups) ? pickups : []).map((p) => {
    const base = rowToLabSample(p as Record<string, unknown>)
    const res = resultsMap[(p as { id: string }).id]
    const resStatus = res?.status ?? ''
    const entryStatus: LabSampleWithResult['entryStatus'] = !res
      ? 'not_entered'
      : ['draft', 'validated', 'flagged', 'approved', 'pending', 'rejected'].includes(resStatus)
        ? (resStatus as LabSampleWithResult['entryStatus'])
        : 'pending'
    return {
      ...base,
      spcResult: res?.spc ?? null,
      coliformResult: res?.total_coliform ?? null,
      entryStatus,
      resultId: res?.id ?? null,
      lastModified: res?.updated_at ?? null,
      onSiteStatus: (typeof base.status === 'string' ? base.status : base.location) ?? null,
    }
  })

  if (filters?.status) {
    const s = filters.status
    if (s === 'not_entered') {
      samples = samples.filter((x) => !x.resultId || x.entryStatus === 'pending')
    } else {
      samples = samples.filter((x) => x.entryStatus === s)
    }
  }

  return { data: samples, count: samples.length }
}

// --- Results with versioning ---
function rowToLabResultEntry(row: Record<string, unknown>): LabResultEntry {
  const r = row as Record<string, unknown>
  const flags = r.flags as string[] | null
  return {
    id: (r.id as string) ?? '',
    sampleId: (r.pickup_id as string) ?? '',
    spcValue: (r.spc as number) ?? null,
    spcUnit: (r.spc_unit as string) ?? null,
    totalColiformValue: (r.total_coliform as number) ?? null,
    totalColiformUnit: (r.total_coliform_unit as string) ?? null,
    method: (r.method as string) ?? null,
    enteredBy: (r.entered_by as string) ?? '',
    enteredAt: (r.entered_at as string) ?? '',
    version: (r.version as number) ?? 1,
    status: (r.status as LabResultEntry['status']) ?? 'draft',
    flags: Array.isArray(flags) ? flags : [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function fetchResultBySampleId(sampleId: string): Promise<LabResultEntry | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('pickup_id', sampleId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return rowToLabResultEntry(data as Record<string, unknown>)
}

export async function fetchResultWithDetails(resultId: string): Promise<{
  result: LabResultEntry | null
  versions: ResultVersion[]
  attachments: ResultAttachment[]
}> {
  if (!isSupabaseConfigured()) {
    return { result: null, versions: [], attachments: [] }
  }

  const [resultRes, versionsRes, attachmentsRes] = await Promise.all([
    supabase.from('lab_results').select('*').eq('id', resultId).single(),
    supabase.from('result_versions').select('*').eq('result_id', resultId).order('version', { ascending: false }),
    supabase.from('result_attachments').select('*').eq('result_id', resultId),
  ])

  const result = resultRes.data
    ? rowToLabResultEntry(resultRes.data as Record<string, unknown>)
    : null

  const versionsRaw = versionsRes.data ?? []
  const versions: ResultVersion[] = Array.isArray(versionsRaw)
    ? versionsRaw.map((v: Record<string, unknown>) => ({
        id: (v.id as string) ?? '',
        resultId: (v.result_id as string) ?? '',
        version: (v.version as number) ?? 0,
        dataSnapshot: (v.data_snapshot as Record<string, unknown>) ?? {},
        changedBy: (v.changed_by as string) ?? null,
        changedAt: (v.changed_at as string) ?? '',
        note: (v.note as string) ?? null,
      }))
    : []

  const attachmentsRaw = attachmentsRes.data ?? []
  const attachments: ResultAttachment[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((a: Record<string, unknown>) => ({
        id: (a.id as string) ?? '',
        resultId: (a.result_id as string) ?? '',
        fileName: (a.file_name as string) ?? '',
        mimeType: (a.mime_type as string) ?? '',
        size: (a.size_bytes as number) ?? 0,
        storagePath: (a.storage_path as string) ?? '',
        uploadedAt: (a.uploaded_at as string) ?? '',
      }))
    : []

  return { result, versions, attachments }
}

export async function createResult(
  input: CreateResultInput,
  enteredBy: string
): Promise<{ id: string; version: number; status: string }> {
  if (!isSupabaseConfigured()) {
    return { id: `mock-${Date.now()}`, version: 1, status: 'draft' }
  }

  const now = new Date().toISOString()
  const { data: inserted, error } = await supabase
    .from('lab_results')
    .insert({
      pickup_id: input.sampleId,
      spc: input.spcValue,
      spc_unit: input.spcUnit,
      total_coliform: input.totalColiformValue,
      total_coliform_unit: input.totalColiformUnit,
      method: input.method,
      entered_by: enteredBy,
      entered_at: now,
      version: 1,
      status: 'draft',
      flags: [],
    })
    .select('id, version, status')
    .single()

  if (error) throw new Error(error.message)

  const resultId = (inserted as { id: string }).id
  await supabase.from('result_versions').insert({
    result_id: resultId,
    version: 1,
    data_snapshot: {
      spcValue: input.spcValue,
      spcUnit: input.spcUnit,
      totalColiformValue: input.totalColiformValue,
      totalColiformUnit: input.totalColiformUnit,
      method: input.method,
    },
    changed_by: enteredBy,
    changed_at: now,
  })

  const atts = input.attachments ?? []
  if (atts.length > 0) {
    await supabase.from('result_attachments').insert(
      atts.map((a) => ({
        result_id: resultId,
        file_name: a.fileName,
        mime_type: a.mimeType,
        size_bytes: a.size,
        storage_path: a.storagePath,
        uploaded_by: enteredBy,
      }))
    )
  }

  return {
    id: resultId,
    version: (inserted as { version: number }).version ?? 1,
    status: (inserted as { status: string }).status ?? 'draft',
  }
}

export async function updateResult(
  resultId: string,
  input: UpdateResultInput,
  enteredBy: string
): Promise<{ version: number; status: string }> {
  if (!isSupabaseConfigured()) {
    return { version: 2, status: 'draft' }
  }

  const { data: existing } = await supabase.from('lab_results').select('version').eq('id', resultId).single()
  const nextVersion = ((existing as { version: number })?.version ?? 1) + 1

  const { data: updated, error } = await supabase
    .from('lab_results')
    .update({
      spc: input.spcValue,
      spc_unit: input.spcUnit,
      total_coliform: input.totalColiformValue,
      total_coliform_unit: input.totalColiformUnit,
      method: input.method,
      version: nextVersion,
      entered_by: enteredBy,
      entered_at: new Date().toISOString(),
    })
    .eq('id', resultId)
    .select('version, status')
    .single()

  if (error) throw new Error(error.message)

  const now = new Date().toISOString()
  await supabase.from('result_versions').insert({
    result_id: resultId,
    version: nextVersion,
    data_snapshot: {
      spcValue: input.spcValue,
      spcUnit: input.spcUnit,
      totalColiformValue: input.totalColiformValue,
      totalColiformUnit: input.totalColiformUnit,
      method: input.method,
    },
    changed_by: enteredBy,
    changed_at: now,
    note: input.note ?? null,
  })

  const atts = input.attachments ?? []
  if (atts.length > 0) {
    await supabase.from('result_attachments').insert(
      atts.map((a) => ({
        result_id: resultId,
        file_name: a.fileName,
        mime_type: a.mimeType,
        size_bytes: a.size,
        storage_path: a.storagePath,
        uploaded_by: enteredBy,
      }))
    )
  }

  return {
    version: (updated as { version: number }).version ?? nextVersion,
    status: (updated as { status: string }).status ?? 'draft',
  }
}

export async function revertResult(
  resultId: string,
  toVersion: number,
  _note: string | null,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { data: versionRow } = await supabase
    .from('result_versions')
    .select('data_snapshot')
    .eq('result_id', resultId)
    .eq('version', toVersion)
    .single()

  if (!versionRow) throw new Error('Version not found')

  const snap = versionRow.data_snapshot as Record<string, unknown>
  await supabase
    .from('lab_results')
    .update({
      spc: snap.spcValue,
      spc_unit: snap.spcUnit,
      total_coliform: snap.totalColiformValue,
      total_coliform_unit: snap.totalColiformUnit,
      method: snap.method,
      version: toVersion,
      entered_by: userId,
      entered_at: new Date().toISOString(),
    })
    .eq('id', resultId)
}

// --- Attachments ---
export async function uploadAttachment(
  resultId: string,
  file: File,
  userId: string
): Promise<ResultAttachment> {
  if (!isSupabaseConfigured()) {
    return {
      id: `att-${Date.now()}`,
      resultId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: `mock/${file.name}`,
      uploadedAt: new Date().toISOString(),
    }
  }

  const path = `lab-attachments/${resultId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from('lab-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data, error: insertErr } = await supabase
    .from('result_attachments')
    .insert({
      result_id: resultId,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: path,
      uploaded_by: userId,
    })
    .select()
    .single()

  if (insertErr) throw new Error(insertErr.message)

  const r = data as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    resultId: (r.result_id as string) ?? '',
    fileName: (r.file_name as string) ?? '',
    mimeType: (r.mime_type as string) ?? '',
    size: (r.size_bytes as number) ?? 0,
    storagePath: (r.storage_path as string) ?? '',
    uploadedAt: (r.uploaded_at as string) ?? '',
  }
}

// --- Thresholds ---
export async function fetchThresholds(customerId?: string, siteId?: string): Promise<ThresholdConfig | null> {
  if (!isSupabaseConfigured()) return null

  let q = supabase
    .from('threshold_configs')
    .select('*')
    .lte('effective_from', new Date().toISOString())
    .or('effective_to.is.null,effective_to.gte.' + new Date().toISOString())

  if (customerId) q = q.eq('customer_id', customerId)
  if (siteId) q = q.eq('site_id', siteId)

  const { data, error } = await q.order('effective_from', { ascending: false }).limit(1).maybeSingle()
  if (error || !data) return null

  const r = data as Record<string, unknown>
  const methods = r.allowed_methods as string[] | null
  return {
    id: (r.id as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    siteId: (r.site_id as string) ?? null,
    spcMin: (r.spc_min as number) ?? null,
    spcMax: (r.spc_max as number) ?? null,
    spcUnit: (r.spc_unit as string) ?? 'CFU/mL',
    tcMin: (r.tc_min as number) ?? null,
    tcMax: (r.tc_max as number) ?? null,
    tcUnit: (r.tc_unit as string) ?? 'CFU/100mL',
    allowedMethods: Array.isArray(methods) ? methods : [],
    effectiveFrom: (r.effective_from as string) ?? '',
    effectiveTo: (r.effective_to as string) ?? null,
  }
}

export async function fetchAllThresholds(): Promise<ThresholdConfig[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('threshold_configs')
    .select('*')
    .order('effective_from', { ascending: false })

  if (error) return []

  const rows = data ?? []
  return Array.isArray(rows)
    ? rows.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        customerId: (r.customer_id as string) ?? null,
        siteId: (r.site_id as string) ?? null,
        spcMin: (r.spc_min as number) ?? null,
        spcMax: (r.spc_max as number) ?? null,
        spcUnit: (r.spc_unit as string) ?? 'CFU/mL',
        tcMin: (r.tc_min as number) ?? null,
        tcMax: (r.tc_max as number) ?? null,
        tcUnit: (r.tc_unit as string) ?? 'CFU/100mL',
        allowedMethods: Array.isArray(r.allowed_methods) ? (r.allowed_methods as string[]) : [],
        effectiveFrom: (r.effective_from as string) ?? '',
        effectiveTo: (r.effective_to as string) ?? null,
      }))
    : []
}

export type CreateThresholdInput = Omit<ThresholdConfig, 'id' | 'effectiveFrom' | 'effectiveTo'> & {
  effectiveFrom?: string
  effectiveTo?: string | null
}

export async function createThreshold(input: CreateThresholdInput): Promise<ThresholdConfig> {
  if (!isSupabaseConfigured()) {
    return {
      ...input,
      id: `th-${Date.now()}`,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: null,
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('threshold_configs')
    .insert({
      customer_id: input.customerId,
      site_id: input.siteId,
      spc_min: input.spcMin,
      spc_max: input.spcMax,
      spc_unit: input.spcUnit,
      tc_min: input.tcMin,
      tc_max: input.tcMax,
      tc_unit: input.tcUnit,
      allowed_methods: input.allowedMethods ?? [],
      effective_from: input.effectiveFrom ?? now,
      effective_to: input.effectiveTo ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const r = data as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    siteId: (r.site_id as string) ?? null,
    spcMin: (r.spc_min as number) ?? null,
    spcMax: (r.spc_max as number) ?? null,
    spcUnit: (r.spc_unit as string) ?? 'CFU/mL',
    tcMin: (r.tc_min as number) ?? null,
    tcMax: (r.tc_max as number) ?? null,
    tcUnit: (r.tc_unit as string) ?? 'CFU/100mL',
    allowedMethods: Array.isArray(r.allowed_methods) ? (r.allowed_methods as string[]) : [],
    effectiveFrom: (r.effective_from as string) ?? now,
    effectiveTo: (r.effective_to as string) ?? null,
  }
}

export async function updateThreshold(
  id: string,
  input: Partial<CreateThresholdInput>
): Promise<ThresholdConfig> {
  if (!isSupabaseConfigured()) {
    return { ...input, id } as ThresholdConfig
  }

  const { data, error } = await supabase
    .from('threshold_configs')
    .update({
      spc_min: input.spcMin,
      spc_max: input.spcMax,
      spc_unit: input.spcUnit,
      tc_min: input.tcMin,
      tc_max: input.tcMax,
      tc_unit: input.tcUnit,
      allowed_methods: input.allowedMethods,
      effective_to: input.effectiveTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  const r = data as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    siteId: (r.site_id as string) ?? null,
    spcMin: (r.spc_min as number) ?? null,
    spcMax: (r.spc_max as number) ?? null,
    spcUnit: (r.spc_unit as string) ?? 'CFU/mL',
    tcMin: (r.tc_min as number) ?? null,
    tcMax: (r.tc_max as number) ?? null,
    tcUnit: (r.tc_unit as string) ?? 'CFU/100mL',
    allowedMethods: Array.isArray(r.allowed_methods) ? (r.allowed_methods as string[]) : [],
    effectiveFrom: (r.effective_from as string) ?? '',
    effectiveTo: (r.effective_to as string) ?? null,
  }
}

// --- CSV Import ---
export interface CSVImportPreviewRow {
  rowIndex: number
  sampleId: string
  spcValue: number | null
  spcUnit: string
  totalColiformValue: number | null
  totalColiformUnit: string
  method: string
  errors: string[]
}

export async function previewCSVImport(
  file: File,
  mappings: Record<string, string>
): Promise<{ previewRows: CSVImportPreviewRow[] }> {
  const text = await file.text()
  const lines = text.split('\n').filter((l) => l.trim())
  const headers = lines[0]?.split(',') ?? []
  const previewRows: CSVImportPreviewRow[] = []

  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const values = lines[i]?.split(',') ?? []
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? ''
    })

    const sampleId = mappings.sampleId ? row[mappings.sampleId] ?? '' : ''
    const spcStr = mappings.spcValue ? row[mappings.spcValue] ?? '' : ''
    const spcUnit = mappings.spcUnit ? row[mappings.spcUnit] ?? 'CFU/mL' : 'CFU/mL'
    const tcStr = mappings.totalColiformValue ? row[mappings.totalColiformValue] ?? '' : ''
    const tcUnit = mappings.totalColiformUnit ? row[mappings.totalColiformUnit] ?? 'CFU/100mL' : 'CFU/100mL'
    const method = mappings.method ? row[mappings.method] ?? '' : ''

    const spcValue = spcStr ? parseFloat(spcStr) : null
    const totalColiformValue = tcStr ? parseFloat(tcStr) : null

    const errors: string[] = []
    if (!sampleId) errors.push('Sample ID required')
    if (spcStr && !Number.isFinite(spcValue!)) errors.push('Invalid SPC value')
    if (tcStr && !Number.isFinite(totalColiformValue!)) errors.push('Invalid Total Coliform value')

    previewRows.push({
      rowIndex: i + 1,
      sampleId,
      spcValue: Number.isFinite(spcValue ?? NaN) ? spcValue : null,
      spcUnit,
      totalColiformValue: Number.isFinite(totalColiformValue ?? NaN) ? totalColiformValue : null,
      totalColiformUnit: tcUnit,
      method,
      errors,
    })
  }

  return { previewRows }
}

export async function createCSVImportJob(
  file: File,
  mappings: Record<string, string>,
  userId: string
): Promise<CSVImportJob> {
  if (!isSupabaseConfigured()) {
    return {
      id: `job-${Date.now()}`,
      uploadedBy: userId,
      status: 'completed',
      totalRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: [],
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }
  }

  const { data: job, error } = await supabase
    .from('csv_import_jobs')
    .insert({
      uploaded_by: userId,
      status: 'pending',
      total_rows: 0,
      success_rows: 0,
      failed_rows: 0,
      errors: [],
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const text = await file.text()
  const lines = text.split('\n').filter((l) => l.trim())
  const headers = lines[0]?.split(',') ?? []
  const totalRows = Math.max(0, lines.length - 1)
  let successRows = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]?.split(',') ?? []
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? ''
    })

    const sampleId = mappings.sampleId ? row[mappings.sampleId] ?? '' : ''
    const spcStr = mappings.spcValue ? row[mappings.spcValue] ?? '' : ''
    const spcUnit = mappings.spcUnit ? row[mappings.spcUnit] ?? 'CFU/mL' : 'CFU/mL'
    const tcStr = mappings.totalColiformValue ? row[mappings.totalColiformValue] ?? '' : ''
    const tcUnit = mappings.totalColiformUnit ? row[mappings.totalColiformUnit] ?? 'CFU/100mL' : 'CFU/100mL'
    const method = mappings.method ? row[mappings.method] ?? '' : ''

    const spcValue = spcStr ? parseFloat(spcStr) : null
    const totalColiformValue = tcStr ? parseFloat(tcStr) : null

    if (!sampleId) {
      errors.push({ row: i + 1, message: 'Sample ID required' })
      continue
    }
    if (spcStr && !Number.isFinite(spcValue!)) {
      errors.push({ row: i + 1, message: 'Invalid SPC value' })
      continue
    }
    if (tcStr && !Number.isFinite(totalColiformValue!)) {
      errors.push({ row: i + 1, message: 'Invalid Total Coliform value' })
      continue
    }

    try {
      await createResult(
        {
          sampleId,
          spcValue,
          spcUnit,
          totalColiformValue,
          totalColiformUnit: tcUnit,
          method: method || null,
        },
        userId
      )
      successRows++
    } catch (e) {
      errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'Import failed' })
    }
  }

  const failedRows = totalRows - successRows

  await supabase
    .from('csv_import_jobs')
    .update({
      status: 'completed',
      total_rows: totalRows,
      success_rows: successRows,
      failed_rows: failedRows,
      errors: errors.slice(0, 100),
      completed_at: new Date().toISOString(),
    })
    .eq('id', (job as { id: string }).id)

  const j = job as Record<string, unknown>
  return {
    id: (j.id as string) ?? '',
    uploadedBy: (j.uploaded_by as string) ?? null,
    status: 'completed',
    totalRows,
    successRows,
    failedRows,
    errors,
    createdAt: (j.created_at as string) ?? '',
    completedAt: new Date().toISOString(),
  }
}

export async function fetchCSVImportJobs(): Promise<CSVImportJob[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('csv_import_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []

  const rows = data ?? []
  return Array.isArray(rows)
    ? rows.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        uploadedBy: (r.uploaded_by as string) ?? null,
        status: (r.status as CSVImportJob['status']) ?? 'pending',
        totalRows: (r.total_rows as number) ?? 0,
        successRows: (r.success_rows as number) ?? 0,
        failedRows: (r.failed_rows as number) ?? 0,
        errors: Array.isArray(r.errors) ? (r.errors as Array<{ row: number; message: string }>) : [],
        createdAt: (r.created_at as string) ?? '',
        completedAt: (r.completed_at as string) ?? null,
      }))
    : []
}
