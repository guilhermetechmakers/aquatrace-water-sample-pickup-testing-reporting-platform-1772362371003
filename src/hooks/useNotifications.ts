/**
 * React Query hooks for Notifications & Alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { notificationsApi } from '@/api/notifications'
import type {
  NotificationUserPreferences,
  NotificationAuditFilters,
  NotificationEventType,
  NotificationStatusType,
  EnqueueEventPayload,
} from '@/types/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  my: () => [...notificationKeys.all, 'my'] as const,
  templates: (params?: { lang?: string; published?: boolean }) =>
    [...notificationKeys.all, 'templates', params] as const,
  audit: (filters?: NotificationAuditFilters) =>
    [...notificationKeys.all, 'audit', filters] as const,
  preferences: (userId: string) => [...notificationKeys.all, 'preferences', userId] as const,
  status: (id: string) => [...notificationKeys.all, 'status', id] as const,
}

export function useMyNotifications(limit = 50) {
  return useQuery({
    queryKey: notificationKeys.my(),
    queryFn: () => notificationsApi.getMyNotifications(limit),
    select: (data) => ({
      notifications: Array.isArray(data) ? data : [],
    }),
  })
}

/** Alias for useNotificationAudit - accepts event_type/status for compatibility */
export function useAudit(filters?: {
  event_type?: string
  status?: string
  eventType?: NotificationEventType
  dateFrom?: string
  dateTo?: string
}) {
  const mappedFilters: NotificationAuditFilters | undefined = filters
    ? {
        eventType: (filters.event_type ?? filters.eventType) as NotificationEventType | undefined,
        status: filters.status as NotificationStatusType | undefined,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }
    : undefined
  return useNotificationAudit(mappedFilters)
}

/** Alias for useNotificationTemplates - returns templates array */
export function useTemplates(params?: { lang?: string; published?: boolean }) {
  const result = useNotificationTemplates(params)
  const templates = result.data?.templates ?? []
  return {
    ...result,
    data: Array.isArray(templates) ? templates : [],
  }
}

/** Alias for useUpsertNotificationTemplate */
export function useUpsertTemplate() {
  return useUpsertNotificationTemplate()
}

/** Register webhook mutation */
export function useRegisterWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { url: string; events_enabled: string[]; auth_secret?: string }) =>
      notificationsApi.registerWebhook({
        url: input.url,
        eventsEnabled: input.events_enabled,
        authSecret: input.auth_secret,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.audit() })
      toast.success('Webhook registered')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to register webhook')
    },
  })
}

/** Alias for usePublishTestNotification */
export function usePublishTestEvent() {
  return useMutation({
    mutationFn: (input: { eventType: string; payload?: Record<string, unknown> }) =>
      notificationsApi.publishTest(input.eventType, input.payload?.recipientUserId as string | undefined),
    onSuccess: () => {
      toast.success('Test event published')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to publish test')
    },
  })
}

export function useNotificationTemplates(params?: { lang?: string; published?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.templates(params),
    queryFn: () => notificationsApi.getTemplates(params),
    select: (data) => ({
      templates: Array.isArray(data) ? data : [],
    }),
  })
}

export function useNotificationAudit(filters?: NotificationAuditFilters) {
  return useQuery({
    queryKey: notificationKeys.audit(filters),
    queryFn: () => notificationsApi.getAudit(filters),
    select: (data) => ({
      notifications: data?.notifications ?? [],
      metrics: data?.metrics ?? {
        totalSent: 0,
        totalFailed: 0,
        totalQueued: 0,
        deadLetterCount: 0,
        byEventType: {},
        byChannel: {},
      },
    }),
  })
}

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.preferences(userId ?? ''),
    queryFn: () => (userId ? notificationsApi.getPreferences(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
    select: (data) => data ?? defaultPreferences(),
  })
}

function defaultPreferences(): NotificationUserPreferences {
  return {
    channelsEnabled: { email: true, sms: false, push: false, in_app: true },
    maxPerHour: 10,
    eventPreferences: {},
  }
}

export function useUpdateNotificationPreferences(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prefs: Partial<NotificationUserPreferences>) =>
      userId ? notificationsApi.updatePreferences(userId, prefs) : Promise.reject(new Error('No user')),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.preferences(userId) })
      }
      toast.success('Notification preferences updated')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to update preferences')
    },
  })
}

export function useUpsertNotificationTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof notificationsApi.upsertTemplate>[0]) =>
      notificationsApi.upsertTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
      toast.success('Template saved')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to save template')
    },
  })
}

export function useEnqueueNotificationEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: EnqueueEventPayload) => notificationsApi.enqueueEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.audit() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.my() })
      toast.success('Event enqueued')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to enqueue event')
    },
  })
}

export function usePublishTestNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: string | { eventType: string; recipientUserId?: string }) => {
      const eventType = typeof input === 'string' ? input : input.eventType
      const recipientUserId = typeof input === 'string' ? undefined : input.recipientUserId
      return notificationsApi.publishTest(eventType, recipientUserId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.audit() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.my() })
      toast.success('Test notification sent')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to send test')
    },
  })
}

/** Realtime subscription for new notifications - use in useEffect */
export function subscribeToNotifications(
  userId: string | undefined,
  onNewNotification: (n: { id: string; event_type: string }) => void,
  refetch: () => void
) {
  if (!userId) return () => {}
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      (payload) => {
        const n = (payload.new ?? {}) as { id?: string; event_type?: string }
        onNewNotification({ id: n?.id ?? '', event_type: n?.event_type ?? '' })
        refetch()
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
