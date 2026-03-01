import { supabase } from '@/lib/supabase'
import type { Role, Permission, RoleChangeAudit, AccessAuditLog } from '@/types/rbac'

export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('name')
  if (error) throw error
  return (data ?? []) as Role[]
}

export async function fetchPermissions(roleId?: string): Promise<Permission[]> {
  let query = supabase.from('permissions').select('*')
  if (roleId) {
    query = query.eq('role_id', roleId)
  }
  const { data, error } = await query.order('resource')
  if (error) throw error
  return (data ?? []) as Permission[]
}

export async function createRole(name: string, description: string | null): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert({ name, description })
    .select()
    .single()
  if (error) throw error
  return data as Role
}

export async function updateRole(id: string, updates: { name?: string; description?: string | null }): Promise<Role> {
  const { data, error } = await supabase.from('roles').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Role
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

export async function createPermission(
  roleId: string,
  resource: string,
  action: string,
  scope: string
): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .insert({ role_id: roleId, resource, action, scope })
    .select()
    .single()
  if (error) throw error
  return data as Permission
}

export async function deletePermission(id: string): Promise<void> {
  const { error } = await supabase.from('permissions').delete().eq('id', id)
  if (error) throw error
}

export async function logRoleChange(params: {
  actorId: string
  targetUserId: string
  fromRole: string | null
  toRole: string
  reason?: string | null
}): Promise<void> {
  const { error } = await supabase.from('role_changes_audit').insert({
    actor_id: params.actorId,
    target_user_id: params.targetUserId,
    from_role: params.fromRole,
    to_role: params.toRole,
    reason: params.reason ?? null,
  })
  if (error) throw error
}

export async function logAccessEvent(params: {
  userId: string
  action: string
  resource: string
  resourceId?: string | null
  payload?: Record<string, unknown> | null
}): Promise<void> {
  const { error } = await supabase.from('access_audit_log').insert({
    user_id: params.userId,
    action: params.action,
    resource: params.resource,
    resource_id: params.resourceId ?? null,
    payload: params.payload ?? null,
  })
  if (error) throw error
}

export async function fetchRoleChangesAudit(limit = 50): Promise<RoleChangeAudit[]> {
  const { data, error } = await supabase
    .from('role_changes_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as RoleChangeAudit[]
}

export async function fetchAccessAuditLog(limit = 50): Promise<AccessAuditLog[]> {
  const { data, error } = await supabase
    .from('access_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AccessAuditLog[]
}
