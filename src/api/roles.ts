import { supabase } from '@/lib/supabase'
import type { Role } from '@/types/rbac'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const now = new Date().toISOString()
const MOCK_ROLES: Role[] = [
  { id: '1', name: 'TECHNICIAN', description: 'Field technician for sample pickup', created_at: now, updated_at: now },
  { id: '2', name: 'LAB_TECH', description: 'Lab technician for test entry', created_at: now, updated_at: now },
  { id: '3', name: 'LAB_MANAGER', description: 'Lab manager for approval and distribution', created_at: now, updated_at: now },
  { id: '4', name: 'ADMIN', description: 'System administrator', created_at: now, updated_at: now },
  { id: '5', name: 'CUSTOMER_VIEW', description: 'Customer portal viewer', created_at: now, updated_at: now },
]

export async function fetchRoles(): Promise<Role[]> {
  if (!isSupabaseConfigured()) return MOCK_ROLES
  const { data, error } = await supabase.from('roles').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as Role[]
}

export async function fetchRoleById(id: string): Promise<Role | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_ROLES.find((r) => r.id === id) ?? null
  }
  const { data, error } = await supabase.from('roles').select('*').eq('id', id).single()
  if (error) return null
  return data as Role
}
