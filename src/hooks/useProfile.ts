import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { profileApi } from '@/api/profile'
import type {
  UpdateProfileInput,
  UpdateNotificationSettingsInput,
  NotificationChannels,
} from '@/types/profile'

export const profileKeys = {
  all: ['profile'] as const,
  profile: () => [...profileKeys.all, 'me'] as const,
  sessions: () => [...profileKeys.all, 'sessions'] as const,
  twoFA: () => [...profileKeys.all, '2fa'] as const,
  notifications: () => [...profileKeys.all, 'notifications'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile(),
    queryFn: profileApi.getProfile,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: UpdateProfileInput) => profileApi.updateProfile(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.profile(), data)
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to update profile')
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to change password')
    },
  })
}

export function useSessions() {
  return useQuery({
    queryKey: profileKeys.sessions(),
    queryFn: profileApi.getSessions,
    select: (data) => ({
      sessions: Array.isArray(data?.sessions) ? data.sessions : [],
    }),
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sessionId: string) => profileApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions() })
      toast.success('Session revoked')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to revoke session')
    },
  })
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (exceptSessionId?: string) => profileApi.revokeAllSessions(exceptSessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions() })
      toast.success('All other sessions revoked')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to revoke sessions')
    },
  })
}

export function use2FA() {
  return useQuery({
    queryKey: profileKeys.twoFA(),
    queryFn: profileApi.get2FA,
    select: (data) => ({
      enabled: Boolean(data?.enabled),
      methods: Array.isArray(data?.methods) ? data.methods : [],
      backupCodesEnabled: Boolean(data?.backupCodesEnabled),
    }),
  })
}

export function useUpdate2FA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: profileApi.update2FA,
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.twoFA(), data)
      toast.success(data?.enabled ? '2FA enabled' : '2FA disabled')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to update 2FA')
    },
  })
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: profileKeys.notifications(),
    queryFn: profileApi.getNotificationSettings,
    select: (data) => ({
      channels: {
        email: Boolean(data?.channels?.email ?? true),
        inApp: Boolean(data?.channels?.inApp ?? true),
        sms: Boolean(data?.channels?.sms ?? false),
      } as NotificationChannels,
      preferences: (data?.preferences ?? {}) as Record<string, boolean>,
    }),
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: UpdateNotificationSettingsInput) =>
      profileApi.updateNotificationSettings(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.notifications(), data)
      toast.success('Notification settings updated')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to update notification settings')
    },
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => profileApi.requestPasswordReset(email),
    onSuccess: () => {
      toast.success('Password reset email sent. Check your inbox.')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to send reset email')
    },
  })
}
