import { supabase } from '@/lib/supabase'
import type { AuditLog, RoleChangeAudit } from '@/types/rbac'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export async function fetchAuditLogs(params?: {
  action?: string
  actor_id?: string
  limit?: number
  offset?: number
}): Promise<AuditLog[]> {
  if (!isSupabaseConfigured()) return []
  let q = supabase
    .from('rbac_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
  if (params?.action) q = q.eq('action', params.action)
  if (params?.actor_id) q = q.eq('actor_id', params.actor_id)
  if (params?.limit) q = q.limit(params.limit)
  if (params?.offset) q = q.range(params.offset, params.offset + (params.limit ?? 10) - 1)
  const { data } = await q
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    actor_id: r.actor_id,
    target_type: r.target_type,
    target_id: r.target_id,
    payload_diff: r.payload_diff as Record<string, unknown> | undefined,
    timestamp: r.created_at,
  }))
}

export async function fetchRoleChangeAudits(params?: {
  target_user_id?: string
  limit?: number
}): Promise<RoleChangeAudit[]> {
  if (!isSupabaseConfigured()) return []
  let q = supabase
    .from('role_changes_audit')
    .select('*')
    .order('created_at', { ascending: false })
  if (params?.target_user_id) q = q.eq('target_user_id', params.target_user_id)
  if (params?.limit) q = q.limit(params.limit)
  const { data } = await q
  return (data ?? []).map((r) => ({
    id: r.id,
    actor_id: r.actor_id,
    target_user_id: r.target_user_id,
    from_role: r.from_role,
    to_role: r.to_role,
    created_at: r.created_at,
    reason: r.reason ?? null,
  }))
}
