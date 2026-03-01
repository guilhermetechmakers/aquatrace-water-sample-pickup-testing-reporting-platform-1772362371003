import { api } from '@/lib/api'
import { mockProfileApi } from '@/api/mock-profile'
import { profileSupabaseApi } from '@/api/profile-supabase'
import type {
  UserProfile,
  UpdateProfileInput,
  SessionsResponse,
  TwoFAStatus,
  TwoFAUpdateInput,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '@/types/profile'

const USE_MOCK = import.meta.env.VITE_MOCK_PROFILE === 'true'
const USE_SUPABASE = Boolean(import.meta.env.VITE_SUPABASE_URL)

async function withMockFallback<T>(
  fn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  if (USE_MOCK) return mockFn()
  try {
    return await fn()
  } catch {
    return mockFn()
  }
}

async function withSupabaseOrRest<T>(
  supabaseFn: () => Promise<T>,
  restFn: () => Promise<T>
): Promise<T> {
  if (USE_SUPABASE) {
    try {
      return await supabaseFn()
    } catch {
      if (USE_MOCK) return mockProfileApi.getProfile() as Promise<T>
      return restFn()
    }
  }
  return restFn()
}

export const profileApi = {
  getProfile: async (): Promise<UserProfile> =>
    USE_SUPABASE
      ? withSupabaseOrRest(
          () => profileSupabaseApi.getProfile(),
          () => api.get<UserProfile>('/users/me/profile')
        ).catch(() => mockProfileApi.getProfile())
      : withMockFallback(
          () => api.get<UserProfile>('/users/me/profile'),
          () => mockProfileApi.getProfile()
        ),

  updateProfile: async (updates: UpdateProfileInput): Promise<UserProfile> =>
    USE_MOCK
      ? mockProfileApi.updateProfile(updates)
      : USE_SUPABASE
        ? profileSupabaseApi.updateProfile(updates).catch(() => api.put<UserProfile>('/users/me/profile', updates))
        : api.put<UserProfile>('/users/me/profile', updates),

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> =>
    USE_SUPABASE
      ? (async () => {
          const { supabase } = await import('@/lib/supabase')
          const { data: { user } } = await supabase.auth.getUser()
          if (!user?.email) throw new Error('Not authenticated')
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword,
          })
          if (signInError) throw new Error('Current password is incorrect')
          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
          if (updateError) throw updateError
        })()
      : api.post('/users/me/change-password', { currentPassword, newPassword }),

  getSessions: async (): Promise<SessionsResponse> =>
    USE_SUPABASE
      ? profileSupabaseApi.getSessions().catch(() => mockProfileApi.getSessions())
      : withMockFallback(
          () => api.get<SessionsResponse>('/users/me/sessions'),
          () => mockProfileApi.getSessions()
        ),

  revokeSession: async (sessionId: string): Promise<void> =>
    USE_SUPABASE
      ? profileSupabaseApi.revokeSession(sessionId)
      : api.post(`/users/me/sessions/${sessionId}/revoke`),

  revokeAllSessions: async (exceptSessionId?: string): Promise<void> =>
    USE_SUPABASE
      ? profileSupabaseApi.revokeAllSessions(exceptSessionId)
      : api.post('/users/me/sessions/revokeAll', exceptSessionId ? { exceptSessionId } : undefined),

  get2FA: async (): Promise<TwoFAStatus> =>
    USE_SUPABASE
      ? profileSupabaseApi.get2FA().catch(() => mockProfileApi.get2FA())
      : withMockFallback(
          () => api.get<TwoFAStatus>('/users/me/2fa'),
          () => mockProfileApi.get2FA()
        ),

  update2FA: async (input: TwoFAUpdateInput): Promise<TwoFAStatus> =>
    USE_SUPABASE
      ? profileSupabaseApi.update2FA(input)
      : api.post<TwoFAStatus>('/users/me/2fa', input),

  getNotificationSettings: async (): Promise<NotificationSettings> =>
    USE_SUPABASE
      ? profileSupabaseApi.getNotificationSettings()
      : withMockFallback(
          () => api.get<NotificationSettings>('/users/me/notification-settings'),
          () => mockProfileApi.getNotificationSettings()
        ),

  updateNotificationSettings: async (
    updates: UpdateNotificationSettingsInput
  ): Promise<NotificationSettings> =>
    USE_MOCK
      ? mockProfileApi.updateNotificationSettings(updates)
      : USE_SUPABASE
        ? profileSupabaseApi.updateNotificationSettings(updates)
        : api.put<NotificationSettings>('/users/me/notification-settings', updates),

  requestPasswordReset: async (email: string): Promise<void> =>
    USE_SUPABASE
      ? profileSupabaseApi.requestPasswordReset(email)
      : api.post('/auth/forgot-password', { email }),
}
