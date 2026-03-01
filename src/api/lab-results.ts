import { supabase } from '@/lib/supabase'
import type { LabResult } from '@/types/rbac'

export type CreateLabResultInput = Omit<LabResult, 'id' | 'status' | 'approved_by' | 'approved_at' | 'pdf_link' | 'created_at' | 'updated_at'>

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const now = new Date().toISOString()
const MOCK_LAB_RESULTS: LabResult[] = [
  { id: 'lr1', pickup_id: 'p1', spc: 25, total_coliform: 0, status: 'pending', approved_by: null, approved_at: null, pdf_link: null, created_at: now, updated_at: now },
  { id: 'lr2', pickup_id: 'p2', spc: 18, total_coliform: 0, status: 'approved', approved_by: null, approved_at: now, pdf_link: null, created_at: now, updated_at: now },
]

export async function fetchLabResults(pickupId?: string): Promise<LabResult[]> {
  if (!isSupabaseConfigured()) {
    const list = pickupId
      ? MOCK_LAB_RESULTS.filter((r) => r.pickup_id === pickupId)
      : MOCK_LAB_RESULTS
    return list
  }
  let q = supabase.from('lab_results').select('*').order('created_at', { ascending: false })
  if (pickupId) q = q.eq('pickup_id', pickupId)
  const { data } = await q
  return (data ?? []) as LabResult[]
}

export async function fetchLabResult(id: string): Promise<LabResult | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_LAB_RESULTS.find((r) => r.id === id) ?? null
  }
  const { data, error } = await supabase.from('lab_results').select('*').eq('id', id).single()
  if (error) return null
  return data as LabResult
}

export async function updateLabResult(
  id: string,
  updates: Partial<Pick<LabResult, 'spc' | 'total_coliform' | 'status'>>
): Promise<LabResult> {
  if (!isSupabaseConfigured()) {
    const existing = MOCK_LAB_RESULTS.find((r) => r.id === id)
    return { ...existing!, ...updates } as LabResult
  }
  const { data, error } = await supabase
    .from('lab_results')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LabResult
}

export async function createLabResult(
  result: CreateLabResultInput
): Promise<LabResult> {
  if (!isSupabaseConfigured()) {
    const now = new Date().toISOString()
    return { ...result, id: `mock-${Date.now()}`, status: 'pending' as const, approved_by: null, approved_at: null, pdf_link: null, created_at: now, updated_at: now }
  }
  const { data, error } = await supabase
    .from('lab_results')
    .insert({ ...result, status: 'pending' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LabResult
}

export async function approveLabResult(
  id: string,
  approvedBy: string,
  _pdfLink?: string | null
): Promise<LabResult> {
  if (!isSupabaseConfigured()) {
    return { ...MOCK_LAB_RESULTS[0], id, status: 'approved' }
  }
  const { data, error } = await supabase
    .from('lab_results')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as LabResult
}
