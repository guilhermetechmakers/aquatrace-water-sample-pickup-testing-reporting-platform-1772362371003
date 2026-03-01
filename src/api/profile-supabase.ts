import { supabase } from '@/lib/supabase'
import { ROLE_LABELS } from '@/types/auth'
import type { AuthRole } from '@/types/auth'
import type {
  UserProfile,
  UpdateProfileInput,
  SessionsResponse,
  TwoFAStatus,
  TwoFAUpdateInput,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '@/types/profile'
import type { Session } from '@/types/profile'

function formatRole(role: string): string {
  return ROLE_LABELS[role as AuthRole] ?? role
}

function mapProfileRow(row: {
  id: string
  display_name: string
  email: string
  phone: string | null
  role: string
  avatar_url: string | null
  created_at: string
}): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    role: formatRole(row.role),
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}

export const profileSupabaseApi = {
  getProfile: async (): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, phone, role, avatar_url, created_at')
      .eq('id', user.id)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Profile not found')
    return mapProfileRow(data)
  },

  updateProfile: async (updates: UpdateProfileInput): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row: Record<string, unknown> = {}
    if (updates.displayName != null) row.display_name = updates.displayName
    if (updates.email != null) row.email = updates.email
    if (updates.phone !== undefined) row.phone = updates.phone

    const { data, error } = await supabase
      .from('profiles')
      .update(row as { display_name?: string; email?: string; phone?: string | null })
      .eq('id', user.id)
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Update failed')
    return mapProfileRow(data)
  },

  getSessions: async (): Promise<SessionsResponse> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rows, error } = await supabase
      .from('user_sessions')
      .select('id, user_id, device_name, ip_address, user_agent, last_active_at, created_at, revoked')
      .eq('user_id', user.id)
      .eq('revoked', false)
      .order('last_active_at', { ascending: false })

    if (error) throw new Error(error.message)

    type Row = { id: string; user_id: string; device_name?: string; ip_address?: string; last_active_at?: string; created_at?: string }
    const sessions: Session[] = (rows ?? []).map((r, i) => {
      const row = r as Row
      return {
        id: row.id,
        userId: row.user_id,
        device: row.device_name ?? 'Unknown',
        location: null,
        lastActive: row.last_active_at ?? row.created_at ?? '',
        ip: row.ip_address ?? null,
        isCurrent: i === 0,
      }
    })

    return { sessions }
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked: true } as { revoked: boolean })
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  },

  revokeAllSessions: async (exceptSessionId?: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
      .from('user_sessions')
      .update({ revoked: true } as { revoked: boolean })
      .eq('user_id', user.id)

    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId)
    }

    const { error } = await query
    if (error) throw new Error(error.message)
  },

  get2FA: async (): Promise<TwoFAStatus> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data } = await supabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('id', user.id)
      .single()

    return {
      enabled: Boolean(data?.mfa_enabled),
      methods: data?.mfa_enabled ? ['totp'] : [],
      backupCodesEnabled: false,
    }
  },

  update2FA: async (input: TwoFAUpdateInput): Promise<TwoFAStatus> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update({ mfa_enabled: input.enable } as { mfa_enabled: boolean })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      enabled: Boolean(data?.mfa_enabled),
      methods: data?.mfa_enabled ? ['totp'] : [],
      backupCodesEnabled: false,
    }
  },

  getNotificationSettings: async (): Promise<NotificationSettings> => {
    return {
      channels: { email: true, inApp: true, sms: false },
      preferences: { accountAlerts: true, sampleUpdates: true, reportReady: true },
    }
  },

  updateNotificationSettings: async (
    _updates: UpdateNotificationSettingsInput
  ): Promise<NotificationSettings> => {
    return profileSupabaseApi.getNotificationSettings()
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    })
  },
}
