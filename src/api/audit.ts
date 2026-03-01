/**
 * Audit Trail API
 * Creates and queries audit log entries via Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase'
import type {
  AuditEntry,
  AuditLogFilters,
  AuditLogResponse,
  AuditSummary,
  CreateAuditLogPayload,
} from '@/types/audit'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Create an audit log entry (fire-and-forget; does not throw) */
export async function createAuditLog(payload: CreateAuditLogPayload): Promise<void> {
  if (!isSupabaseConfigured()) return

  try {
    await supabase.functions.invoke('audit-create', {
      body: {
        userId: payload.userId,
        userName: payload.userName ?? undefined,
        actionType: payload.actionType,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        metadata: payload.metadata ?? {},
        signed: payload.signed ?? false,
        signature: payload.signature ?? undefined,
      },
    })
  } catch {
    // Fire-and-forget; do not propagate errors to caller
  }
}

/** Fetch audit logs with filters via Edge Function (GET) */
export async function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLogResponse> {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page: 1, pageSize: 20 }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

    const params = new URLSearchParams()
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    if (filters?.userId) params.set('userId', filters.userId)
    if (filters?.q) params.set('q', filters.q)
    params.set('page', String(filters?.page ?? 1))
    params.set('pageSize', String(filters?.pageSize ?? 20))
    if ((filters?.actionTypes ?? []).length > 0) params.set('actionTypes', (filters?.actionTypes ?? []).join(','))
    if ((filters?.resourceTypes ?? []).length > 0) params.set('resourceTypes', (filters?.resourceTypes ?? []).join(','))
    if ((filters?.resourceIds ?? []).length > 0) params.set('resourceIds', (filters?.resourceIds ?? []).join(','))

    const res = await fetch(`${supabaseUrl}/functions/v1/audit-logs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return { data: [], total: 0, page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 20 }

    const raw = (await res.json()) as { data?: AuditEntry[]; total?: number; page?: number; pageSize?: number }
    const list = Array.isArray(raw?.data) ? raw.data : []
    const defPage = filters?.page ?? 1
    const defPageSize = filters?.pageSize ?? 20
    return {
      data: list,
      total: typeof raw?.total === 'number' ? raw.total : list.length,
      page: typeof raw?.page === 'number' ? raw.page : defPage,
      pageSize: typeof raw?.pageSize === 'number' ? raw.pageSize : defPageSize,
    }
  } catch {
    const defPage = filters?.page ?? 1
    const defPageSize = filters?.pageSize ?? 20
    return { data: [], total: 0, page: defPage, pageSize: defPageSize }
  }
}

/** Export audit logs as CSV or JSON - returns Blob for download */
export async function exportAuditLogs(
  filters: Omit<AuditLogFilters, 'page' | 'pageSize'> & { format?: 'csv' | 'json' }
): Promise<Blob> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.userId) params.set('userId', filters.userId)
  params.set('format', filters.format ?? 'json')
  if ((filters.actionTypes ?? []).length > 0) params.set('actionTypes', (filters.actionTypes ?? []).join(','))
  if ((filters.resourceTypes ?? []).length > 0) params.set('resourceTypes', (filters.resourceTypes ?? []).join(','))

  const res = await fetch(`${supabaseUrl}/functions/v1/audit-export?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}

/** Fetch audit summary via Edge Function (GET) */
export async function fetchAuditSummary(filters?: { from?: string; to?: string }): Promise<AuditSummary> {
  if (!isSupabaseConfigured()) {
    return { byActionType: {}, byResourceType: {}, topResources: [], total: 0 }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

    const params = new URLSearchParams()
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)

    const res = await fetch(`${supabaseUrl}/functions/v1/audit-summary?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return { byActionType: {}, byResourceType: {}, topResources: [], total: 0 }

    const raw = (await res.json()) as AuditSummary
    return {
      byActionType: raw?.byActionType ?? {},
      byResourceType: raw?.byResourceType ?? {},
      topResources: Array.isArray(raw?.topResources) ? raw.topResources : [],
      total: typeof raw?.total === 'number' ? raw.total : 0,
    }
  } catch {
    return { byActionType: {}, byResourceType: {}, topResources: [], total: 0 }
  }
}
