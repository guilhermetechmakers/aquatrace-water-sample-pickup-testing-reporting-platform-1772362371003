import { supabase } from '@/lib/supabase'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export interface ProfileUser {
  id: string
  email: string
  display_name: string
  role: string
  status: string
  last_login: string | null
  invited_at: string | null
  created_at: string
}

export async function fetchProfiles(): Promise<ProfileUser[]> {
  return fetchUsers()
}

const MOCK_USERS: ProfileUser[] = [
  { id: '1', email: 'admin@example.com', display_name: 'Admin', role: 'ADMIN', status: 'active', last_login: new Date().toISOString(), invited_at: null, created_at: new Date().toISOString() },
  { id: '2', email: 'tech@example.com', display_name: 'Technician', role: 'TECHNICIAN', status: 'active', last_login: null, invited_at: null, created_at: new Date().toISOString() },
  { id: '3', email: 'labmanager@example.com', display_name: 'Lab Manager', role: 'LAB_MANAGER', status: 'active', last_login: null, invited_at: null, created_at: new Date().toISOString() },
]

export async function fetchUsers(): Promise<ProfileUser[]> {
  if (!isSupabaseConfigured()) return MOCK_USERS
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, status, last_login, invited_at, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProfileUser[]
}

/** Fetch users with Lab Manager or Admin role for reassignment dropdown */
export async function fetchLabManagers(): Promise<ProfileUser[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_USERS.filter((u) => ['ADMIN', 'LAB_MANAGER'].includes(u.role))
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, status, last_login, invited_at, created_at')
    .in('role', ['LAB_MANAGER', 'ADMIN'])
    .order('display_name', { ascending: true })
  if (error) throw error
  const list = data ?? []
  return Array.isArray(list) ? (list as ProfileUser[]) : []
}

export async function updateProfileRole(
  userId: string,
  role: string
): Promise<ProfileUser> {
  return updateUserRole(userId, role)
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<ProfileUser> {
  if (!isSupabaseConfigured()) {
    const u = MOCK_USERS.find((x) => x.id === userId)
    if (u) u.role = role
    return u ?? (MOCK_USERS[0] as ProfileUser)
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select('id, email, display_name, role, status, last_login, invited_at, created_at')
    .single()
  if (error) throw error
  return data as ProfileUser
}

export async function updateProfileStatus(
  userId: string,
  status: 'active' | 'invited' | 'suspended'
): Promise<ProfileUser> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select('id, email, display_name, role, status, last_login, invited_at, created_at')
    .single()
  if (error) throw error
  return data as ProfileUser
}

/** Stub for invite user - would call Edge Function to send email/SMS */
export async function inviteUser(
  _emailOrParams: string | { email: string; role: string; displayName?: string },
  _name?: string,
  _roleOrRoleId?: string,
  _invitedBy?: string
): Promise<{ success: boolean; message: string }> {
  // In production: call Supabase Edge Function that creates auth user,
  // sends invite email, generates invitation_token, etc.
  return { success: true, message: 'Invitation workflow stubbed - integrate with Edge Function' }
}
