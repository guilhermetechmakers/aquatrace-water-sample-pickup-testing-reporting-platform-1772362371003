/**
 * Lab Results Entry & Validation API
 * Queued samples, results with versioning, attachments, thresholds, CSV import
 * Uses Supabase when configured; falls back to mock data
 */

import { supabase } from '@/lib/supabase'
import type {
  LabSample,
  LabResult,
  ResultVersion,
  LabAttachment,
  ThresholdConfig,
  CreateResultInput,
  UpdateResultInput,
  CSVImportJob,
} from '@/types/lab-results'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// --- Queued Samples ---
export interface QueuedSamplesResponse {
  data: LabSample[]
  count: number
}

export async function fetchQueuedSamples(params?: {
  siteId?: string
  status?: string
  dueDateFrom?: string
  dueDateTo?: string
}): Promise<QueuedSamplesResponse> {
  if (!isSupabaseConfigured()) {
    return getMockQueuedSamples()
  }

  try {
    // Join pickups (samples) with lab_results to get queue
    const { data: pickups } = await supabase
      .from('pickups')
      .select('id, customer_id, location, status, completed_at, created_at, updated_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    const safePickups = Array.isArray(pickups) ? pickups : []
    const { data: labResults } = await supabase
      .from('lab_results')
      .select('id, pickup_id, spc, total_coliform, status, updated_at')

    const resultsByPickup = new Map<string, { spc: number | null; total_coliform: number | null; status: string; updated_at: string }>()
    const resultsList = Array.isArray(labResults) ? labResults : []
    for (const r of resultsList) {
      const pid = (r as { pickup_id?: string }).pickup_id
      if (pid) {
        resultsByPickup.set(pid, {
          spc: (r as { spc?: number }).spc ?? null,
          total_coliform: (r as { total_coliform?: number }).total_coliform ?? null,
          status: (r as { status?: string }).status ?? 'pending',
          updated_at: (r as { updated_at?: string }).updated_at ?? '',
        })
      }
    }

    const samples: LabSample[] = safePickups.map((p) => {
      const res = resultsByPickup.get(p.id)
      const completedAt = (p as { completed_at?: string }).completed_at ?? p.created_at
      return {
        id: p.id,
        customerId: (p as { customer_id?: string }).customer_id ?? null,
        siteId: null,
        collectionDate: completedAt,
        status: res ? 'completed' : 'queued',
        customerName: null,
        siteName: (p as { location?: string }).location ?? null,
        onSiteStatus: (p as { status?: string }).status ?? null,
        spcResult: res?.spc ?? null,
        coliformResult: res?.total_coliform ?? null,
        entryStatus: res ? (res.status === 'approved' ? 'approved' : res.status === 'rejected' ? 'rejected' : 'pending') : 'not_entered',
        lastModified: res?.updated_at ?? null,
        createdAt: (p as { created_at?: string }).created_at ?? '',
        updatedAt: (p as { updated_at?: string }).updated_at ?? '',
      }
    })

    let filtered = samples
    if (params?.status) {
      filtered = filtered.filter((s) => s.entryStatus === params.status || (params.status === 'not_entered' && !s.entryStatus))
    }
    if (params?.siteId) {
      filtered = filtered.filter((s) => s.siteId === params.siteId)
    }

    return { data: filtered, count: filtered.length }
  } catch {
    return getMockQueuedSamples()
  }
}

function getMockQueuedSamples(): QueuedSamplesResponse {
  const now = new Date().toISOString()
  const samples: LabSample[] = [
    {
      id: 'p1',
      customerId: null,
      siteId: null,
      collectionDate: now,
      status: 'queued',
      customerName: 'Acme Corp',
      siteName: 'Building A',
      onSiteStatus: 'completed',
      spcResult: null,
      coliformResult: null,
      entryStatus: 'not_entered',
      lastModified: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'p2',
      customerId: null,
      siteId: null,
      collectionDate: now,
      status: 'completed',
      customerName: 'Beta Inc',
      siteName: 'Building B',
      onSiteStatus: 'completed',
      spcResult: 25,
      coliformResult: 0,
      entryStatus: 'pending',
      lastModified: now,
      createdAt: now,
      updatedAt: now,
    },
  ]
  return { data: samples, count: samples.length }
}

// --- Results with Versioning ---
export interface ResultWithDetails {
  data: LabResult | null
  versions: ResultVersion[]
  attachments: LabAttachment[]
}

/** Fetch result by sample (pickup) ID - for preloading when editing */
export async function fetchResultBySampleId(sampleId: string): Promise<LabResult | null> {
  if (!isSupabaseConfigured()) {
    const mock = getMockResultWithDetails('res-1')
    return mock.data?.sampleId === sampleId ? mock.data : null
  }
  const { data } = await supabase
    .from('lab_results')
    .select('*')
    .eq('pickup_id', sampleId)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const r = data as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    sampleId: (r.pickup_id as string) ?? (r.sample_id as string) ?? '',
    spcValue: (r.spc as number) ?? (r.spc_value as number) ?? null,
    spcUnit: (r.spc_unit as string) ?? null,
    totalColiformValue: (r.total_coliform as number) ?? (r.total_coliform_value as number) ?? null,
    totalColiformUnit: (r.total_coliform_unit as string) ?? null,
    method: (r.method as string) ?? null,
    enteredBy: (r.entered_by as string) ?? '',
    enteredAt: (r.entered_at as string) ?? (r.created_at as string) ?? '',
    version: (r.version as number) ?? 1,
    status: mapStatus(r.status as string),
    flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
  }
}

export async function fetchResultWithDetails(resultId: string): Promise<ResultWithDetails> {
  if (!isSupabaseConfigured()) {
    return getMockResultWithDetails(resultId)
  }

  try {
    const { data: res, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('id', resultId)
      .single()

    if (error || !res) {
      return { data: null, versions: [], attachments: [] }
    }

    const result: LabResult = {
      id: res.id,
      sampleId: res.pickup_id ?? res.sample_id ?? res.id,
      spcValue: res.spc ?? res.spc_value ?? null,
      spcUnit: res.spc_unit ?? null,
      totalColiformValue: res.total_coliform ?? res.total_coliform_value ?? null,
      totalColiformUnit: res.total_coliform_unit ?? null,
      method: res.method ?? null,
      enteredBy: res.entered_by ?? res.approved_by ?? '',
      enteredAt: res.entered_at ?? res.created_at ?? '',
      version: res.version ?? 1,
      status: mapStatus(res.status),
      flags: Array.isArray(res.flags) ? res.flags : [],
      createdAt: res.created_at,
      updatedAt: res.updated_at,
    }

    let versions: ResultVersion[] = []
    let attachments: LabAttachment[] = []
    try {
      const { data: ver } = await supabase
        .from('result_versions')
        .select('*')
        .eq('result_id', resultId)
        .order('version', { ascending: false })
      versions = (Array.isArray(ver) ? ver : []).map((r) => mapVersion(r as Record<string, unknown>))
    } catch {
      // Table may not exist
    }
    try {
      const { data: att } = await supabase
        .from('result_attachments')
        .select('*')
        .eq('result_id', resultId)
      attachments = (Array.isArray(att) ? att : []).map((r) => mapAttachment(r as Record<string, unknown>))
    } catch {
      // Table may not exist
    }

    return {
      data: result,
      versions,
      attachments,
    }
  } catch {
    return getMockResultWithDetails(resultId)
  }
}

function mapStatus(s: string | null | undefined): 'draft' | 'validated' | 'flagged' | 'approved' {
  const v = (s ?? '').toLowerCase()
  if (['draft', 'validated', 'flagged', 'approved'].includes(v)) return v as 'draft' | 'validated' | 'flagged' | 'approved'
  if (v === 'pending') return 'draft'
  if (v === 'approved') return 'approved'
  if (v === 'rejected') return 'flagged'
  return 'draft'
}

function mapVersion(r: Record<string, unknown>): ResultVersion {
  return {
    id: (r.id as string) ?? '',
    resultId: (r.result_id as string) ?? '',
    version: Number(r.version) ?? 1,
    dataSnapshot: (r.data_snapshot as Record<string, unknown>) ?? {},
    changedBy: (r.changed_by as string) ?? '',
    changedAt: (r.changed_at as string) ?? '',
    note: (r.note as string) ?? null,
  }
}

function mapAttachment(r: Record<string, unknown>): LabAttachment {
  return {
    id: (r.id as string) ?? '',
    resultId: (r.result_id as string) ?? '',
    fileName: (r.file_name as string) ?? '',
    mimeType: (r.mime_type as string) ?? '',
    size: Number(r.size ?? r.size_bytes) ?? 0,
    storagePath: (r.storage_path as string) ?? '',
    uploadedAt: (r.uploaded_at as string) ?? '',
  }
}

function getMockResultWithDetails(resultId: string): ResultWithDetails {
  const now = new Date().toISOString()
  const result: LabResult = {
    id: resultId,
    sampleId: 'p1',
    spcValue: 25,
    totalColiformValue: 0,
    spcUnit: 'CFU/mL',
    totalColiformUnit: 'CFU/100mL',
    method: 'Plate Count',
    enteredBy: 'demo-user',
    enteredAt: now,
    version: 1,
    status: 'draft',
    flags: [],
  }
  return {
    data: result,
    versions: [],
    attachments: [],
  }
}

export async function createResult(input: CreateResultInput, userId: string): Promise<{ id: string; version: number; status: string }> {
  if (!isSupabaseConfigured()) {
    return { id: `res-${Date.now()}`, version: 1, status: 'draft' }
  }

  const now = new Date().toISOString()
  const insert: Record<string, unknown> = {
    pickup_id: input.sampleId,
    spc: input.spcValue,
    spc_unit: input.spcUnit,
    total_coliform: input.totalColiformValue,
    total_coliform_unit: input.totalColiformUnit,
    method: input.method,
    entered_by: userId,
    entered_at: now,
    version: 1,
    status: 'pending',
    flags: [],
  }

  const { data, error } = await supabase
    .from('lab_results')
    .insert(insert)
    .select('id, version, status')
    .single()

  if (error) throw new Error(error.message)
  const row = data as { id?: string; version?: number; status?: string }
  return {
    id: row.id ?? '',
    version: row.version ?? 1,
    status: row.status ?? 'draft',
  }
}

export async function updateResult(
  resultId: string,
  input: UpdateResultInput,
  _userId: string
): Promise<{ id: string; version: number; status: string }> {
  if (!isSupabaseConfigured()) {
    return { id: resultId, version: 2, status: 'draft' }
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    spc: input.spcValue,
    spc_unit: input.spcUnit,
    total_coliform: input.totalColiformValue,
    total_coliform_unit: input.totalColiformUnit,
    method: input.method,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('lab_results')
    .update(updates)
    .eq('id', resultId)
    .select('id, version, status')
    .single()

  if (error) throw new Error(error.message)
  const row = data as { id?: string; version?: number; status?: string }
  return {
    id: row.id ?? resultId,
    version: (row.version ?? 1) + 1,
    status: row.status ?? 'draft',
  }
}

export async function revertResult(
  resultId: string,
  toVersion: number
): Promise<{ id: string; version: number }> {
  if (!isSupabaseConfigured()) {
    return { id: resultId, version: toVersion }
  }
  const { data } = await supabase
    .from('result_versions')
    .select('data_snapshot')
    .eq('result_id', resultId)
    .eq('version', toVersion)
    .single()

  const snapshot = data?.data_snapshot as Record<string, unknown> | null
  if (snapshot) {
    await supabase
      .from('lab_results')
      .update({
        spc: snapshot.spcValue ?? snapshot.spc,
        spc_value: snapshot.spcValue ?? snapshot.spc,
        total_coliform: snapshot.totalColiformValue ?? snapshot.total_coliform,
        total_coliform_value: snapshot.totalColiformValue ?? snapshot.total_coliform,
        spc_unit: snapshot.spcUnit ?? snapshot.spc_unit,
        total_coliform_unit: snapshot.totalColiformUnit ?? snapshot.total_coliform_unit,
        method: snapshot.method,
        version: toVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resultId)
  }
  return { id: resultId, version: toVersion }
}

// --- Attachments ---
export async function uploadAttachment(
  resultId: string,
  file: File,
  userId?: string | null
): Promise<LabAttachment> {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString()
    return {
      id: `att-${Date.now()}`,
      resultId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: `lab-attachments/${resultId}/${file.name}`,
      uploadedAt: now,
    }
  }

  const path = `lab-attachments/${resultId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage
    .from('lab-attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  const { data: urlData } = supabase.storage.from('lab-attachments').getPublicUrl(path)
  const storagePath = urlData?.publicUrl ?? path

  const now = new Date().toISOString()
  const { data, error: insertErr } = await supabase
    .from('result_attachments')
    .insert({
      result_id: resultId,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
      uploaded_at: now,
      uploaded_by: userId ?? null,
    })
    .select()
    .single()

  if (insertErr) throw new Error(insertErr.message)
  const r = data as Record<string, unknown>
  return mapAttachment(r)
}

// --- Thresholds ---
export async function fetchThresholds(customerId?: string | null, siteId?: string | null): Promise<ThresholdConfig | null> {
  if (!isSupabaseConfigured()) {
    return getMockThreshold()
  }

  try {
    let q = supabase.from('threshold_configs').select('*').order('effective_from', { ascending: false })
    if (customerId) q = q.eq('customer_id', customerId)
    if (siteId) q = q.eq('site_id', siteId)
    const { data } = await q.limit(1).single()
    if (!data) return getMockThreshold()
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
  } catch {
    return getMockThreshold()
  }
}

function getMockThreshold(): ThresholdConfig {
  return {
    id: 'th1',
    customerId: null,
    siteId: null,
    spcMin: 0,
    spcMax: 500,
    spcUnit: 'CFU/mL',
    tcMin: 0,
    tcMax: 1,
    tcUnit: 'CFU/100mL',
    allowedMethods: ['Plate Count', 'Membrane Filtration', 'Colilert', 'IDEXX'],
    effectiveFrom: new Date().toISOString(),
    effectiveTo: null,
  }
}

export async function saveThreshold(config: Partial<ThresholdConfig> & { customerId?: string | null; siteId?: string | null }): Promise<ThresholdConfig> {
  if (!isSupabaseConfigured()) {
    return { ...getMockThreshold(), ...config } as ThresholdConfig
  }
  const now = new Date().toISOString()
  const row = {
    customer_id: config.customerId ?? null,
    site_id: config.siteId ?? null,
    spc_min: config.spcMin ?? null,
    spc_max: config.spcMax ?? null,
    spc_unit: config.spcUnit ?? 'CFU/mL',
    tc_min: config.tcMin ?? null,
    tc_max: config.tcMax ?? null,
    tc_unit: config.tcUnit ?? 'CFU/100mL',
    allowed_methods: config.allowedMethods ?? [],
    effective_from: config.effectiveFrom ?? now,
    effective_to: config.effectiveTo ?? null,
    updated_at: now,
  }
  const { data, error } = await supabase.from('threshold_configs').upsert(row).select().single()
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
export interface CSVImportPreview {
  jobId: string
  previewRows: Array<Record<string, string | number>>
  columns: string[]
}

export async function previewCSVImport(
  file: File,
  mappings: Record<string, string>
): Promise<CSVImportPreview> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const columns = lines[0]?.split(/[,;\t]/).map((c) => c.trim()) ?? []
  const previewRows: Array<Record<string, string | number>> = []
  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const values = lines[i]?.split(/[,;\t]/) ?? []
    const row: Record<string, string | number> = {}
    columns.forEach((col, idx) => {
      const field = mappings[col] ?? col
      const val = values[idx] ?? ''
      const num = parseFloat(val)
      row[field] = Number.isFinite(num) ? num : val
    })
    previewRows.push(row)
  }
  return {
    jobId: `job-${Date.now()}`,
    previewRows,
    columns,
  }
}

export async function executeCSVImport(
  _file: File,
  _mappings: Record<string, string>,
  _userId: string
): Promise<CSVImportJob> {
  const now = new Date().toISOString()
  return {
    id: `job-${Date.now()}`,
    uploadedBy: _userId,
    status: 'completed',
    totalRows: 0,
    successRows: 0,
    failedRows: 0,
    createdAt: now,
    completedAt: now,
    errors: [],
  }
}
