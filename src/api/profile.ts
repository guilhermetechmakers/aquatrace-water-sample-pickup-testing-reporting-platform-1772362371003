import { api } from '@/lib/api'
import { mockProfileApi } from '@/api/mock-profile'
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

export const profileApi = {
  getProfile: async (): Promise<UserProfile> =>
    withMockFallback(
      () => api.get<UserProfile>('/users/me/profile'),
      () => mockProfileApi.getProfile()
    ),

  updateProfile: async (updates: UpdateProfileInput): Promise<UserProfile> =>
    USE_MOCK
      ? mockProfileApi.updateProfile(updates)
      : api.put<UserProfile>('/users/me/profile', updates),

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> =>
    api.post('/users/me/change-password', { currentPassword, newPassword }),

  getSessions: async (): Promise<SessionsResponse> =>
    withMockFallback(
      () => api.get<SessionsResponse>('/users/me/sessions'),
      () => mockProfileApi.getSessions()
    ),

  revokeSession: async (sessionId: string): Promise<void> =>
    api.post(`/users/me/sessions/${sessionId}/revoke`),

  revokeAllSessions: async (): Promise<void> =>
    api.post('/users/me/sessions/revokeAll'),

  get2FA: async (): Promise<TwoFAStatus> =>
    withMockFallback(
      () => api.get<TwoFAStatus>('/users/me/2fa'),
      () => mockProfileApi.get2FA()
    ),

  update2FA: async (input: TwoFAUpdateInput): Promise<TwoFAStatus> =>
    api.post<TwoFAStatus>('/users/me/2fa', input),

  getNotificationSettings: async (): Promise<NotificationSettings> =>
    withMockFallback(
      () => api.get<NotificationSettings>('/users/me/notification-settings'),
      () => mockProfileApi.getNotificationSettings()
    ),

  updateNotificationSettings: async (
    updates: UpdateNotificationSettingsInput
  ): Promise<NotificationSettings> =>
    USE_MOCK
      ? mockProfileApi.updateNotificationSettings(updates)
      : api.put<NotificationSettings>('/users/me/notification-settings', updates),

  requestPasswordReset: async (email: string): Promise<void> =>
    api.post('/auth/forgot-password', { email }),
}
