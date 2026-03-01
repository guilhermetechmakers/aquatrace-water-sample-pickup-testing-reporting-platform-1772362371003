/**
 * Notifications & Alerts API
 * Uses Supabase for data and Edge Functions for event dispatch
 */

import { supabase } from '@/lib/supabase'
import type {
  Notification,
  NotificationTemplate,
  NotificationUserPreferences,
  NotificationWebhook,
  NotificationStatusResponse,
  NotificationAuditFilters,
  NotificationAuditMetrics,
  EnqueueEventPayload,
} from '@/types/notifications'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function mapNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id ?? ''),
    eventType: (row.event_type as Notification['eventType']) ?? 'pickup_assigned',
    recipientUserId: String(row.recipient_user_id ?? ''),
    channel: (row.channel as Notification['channel']) ?? 'email',
    status: (row.status as Notification['status']) ?? 'queued',
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 3),
    lastAttemptAt: row.last_attempt_at ? String(row.last_attempt_at) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    templateId: row.template_id ? String(row.template_id) : null,
    failReason: row.fail_reason ? String(row.fail_reason) : null,
    isDeadLetter: Boolean(row.is_dead_letter ?? false),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

function mapTemplateRow(row: Record<string, unknown>): NotificationTemplate {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    language: String(row.language ?? 'en'),
    subject: row.subject ? String(row.subject) : null,
    htmlBody: row.html_body ? String(row.html_body) : null,
    textBody: row.text_body ? String(row.text_body) : null,
    version: Number(row.version ?? 1),
    isPublished: Boolean(row.is_published ?? false),
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export const notificationsApi = {
  /** Enqueue a notification event (calls Edge Function) */
  enqueueEvent: async (payload: EnqueueEventPayload): Promise<{ id?: string }> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase.functions.invoke('notifications-events', {
      body: payload,
    })
    if (error) throw new Error(error.message ?? 'Failed to enqueue event')
    const result = (data ?? {}) as { id?: string; error?: string }
    if (result.error) throw new Error(result.error)
    return { id: result.id }
  },

  /** Get notification delivery status */
  getStatus: async (id: string): Promise<NotificationStatusResponse> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('notifications')
      .select('id, status, last_attempt_at, attempt_count')
      .eq('id', id)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Notification not found')

    const { data: retries } = await supabase
      .from('notification_retries_log')
      .select('attempt_number, status, response, created_at')
      .eq('notification_id', id)
      .order('attempt_number', { ascending: false })

    const failures = (retries ?? [])
      .filter((r: { status: string }) => r.status === 'failed')
      .map((r: { created_at: string; response: string }) => ({
        time: r.created_at ?? '',
        reason: r.response ?? 'Unknown',
      }))

    return {
      id: String(data.id),
      status: (data.status as NotificationStatusResponse['status']) ?? 'queued',
      lastAttemptAt: data.last_attempt_at ? String(data.last_attempt_at) : null,
      attemptCount: Number(data.attempt_count ?? 0),
      failures: Array.isArray(failures) ? failures : [],
    }
  },

  /** Create or update template */
  upsertTemplate: async (input: {
    id?: string
    name: string
    language?: string
    subject?: string
    htmlBody?: string
    textBody?: string
    version?: number
    isPublished?: boolean
  }): Promise<NotificationTemplate> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const row = {
      name: input.name,
      language: input.language ?? 'en',
      subject: input.subject ?? null,
      html_body: input.htmlBody ?? null,
      text_body: input.textBody ?? null,
      version: input.version ?? 1,
      is_published: input.isPublished ?? false,
      updated_by: user.id,
    }

    if (input.id) {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(row)
        .eq('id', input.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return mapTemplateRow((data ?? {}) as Record<string, unknown>)
    }

    const { data, error } = await supabase
      .from('notification_templates')
      .insert({ ...row, created_by: user.id })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapTemplateRow((data ?? {}) as Record<string, unknown>)
  },

  /** Fetch templates with optional filters */
  getTemplates: async (params?: {
    lang?: string
    published?: boolean
  }): Promise<NotificationTemplate[]> => {
    if (!isSupabaseConfigured()) return []
    let query = supabase
      .from('notification_templates')
      .select('*')
      .order('name')
      .order('language')

    if (params?.lang) {
      query = query.eq('language', params.lang)
    }
    if (params?.published === true) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Record<string, unknown>[]
    return Array.isArray(rows) ? rows.map(mapTemplateRow) : []
  },

  /** Register webhook */
  registerWebhook: async (input: {
    url: string
    eventsEnabled: string[]
    authSecret?: string
  }): Promise<NotificationWebhook> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('notification_webhooks')
      .insert({
        url: input.url,
        events_enabled: input.eventsEnabled ?? [],
        auth_secret: input.authSecret ?? null,
        retries: 3,
        timeout_seconds: 30,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    const row = (data ?? {}) as Record<string, unknown>
    return {
      id: String(row.id ?? ''),
      url: String(row.url ?? ''),
      eventsEnabled: Array.isArray(row.events_enabled) ? row.events_enabled : [],
      retries: Number(row.retries ?? 3),
      timeoutSeconds: Number(row.timeout_seconds ?? 30),
      createdAt: String(row.created_at ?? ''),
    }
  },

  /** Trigger manual dispatch for testing */
  publishTest: async (eventType: string, recipientUserId?: string): Promise<{ ok: boolean }> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const body: { event_type: string; recipient_user_id?: string } = { event_type: eventType }
    if (recipientUserId) body.recipient_user_id = recipientUserId
    const { data, error } = await supabase.functions.invoke('notifications-publish', {
      body,
    })
    if (error) throw new Error(error.message ?? 'Failed to publish')
    const result = (data ?? {}) as { ok?: boolean; error?: string }
    if (result.error) throw new Error(result.error)
    return { ok: result.ok ?? true }
  },

  /** Fetch audit logs and metrics */
  getAudit: async (filters?: NotificationAuditFilters): Promise<{
    notifications: Notification[]
    metrics: NotificationAuditMetrics
  }> => {
    if (!isSupabaseConfigured()) {
      return {
        notifications: [],
        metrics: {
          totalSent: 0,
          totalFailed: 0,
          totalQueued: 0,
          deadLetterCount: 0,
          byEventType: {},
          byChannel: {},
        },
      }
    }
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data: notifData, error } = await query
    if (error) throw new Error(error.message)
    const notifications = ((notifData ?? []) as Record<string, unknown>[]).map(mapNotificationRow)

    const { count: deadLetterCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_dead_letter', true)

    const byEvent: Record<string, number> = {}
    const byChannel: Record<string, number> = {}
    let totalSent = 0
    let totalFailed = 0
    let totalQueued = 0

    for (const n of notifications) {
      byEvent[n.eventType] = (byEvent[n.eventType] ?? 0) + 1
      byChannel[n.channel] = (byChannel[n.channel] ?? 0) + 1
      if (n.status === 'delivered') totalSent++
      else if (n.status === 'failed' || n.isDeadLetter) totalFailed++
      else if (n.status === 'queued' || n.status === 'in_progress') totalQueued++
    }

    const metrics: NotificationAuditMetrics = {
      totalSent,
      totalFailed,
      totalQueued,
      deadLetterCount: deadLetterCount ?? 0,
      byEventType: byEvent,
      byChannel,
    }

    return { notifications, metrics }
  },

  /** User notification preferences */
  getPreferences: async (userId: string): Promise<NotificationUserPreferences> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data, error } = await supabase
      .from('notification_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    const row = (data ?? {}) as Record<string, unknown>
    const eventPrefs = (row.event_preferences as Record<string, unknown>) ?? {}
    return {
      channelsEnabled: (row.channels_enabled as NotificationUserPreferences['channelsEnabled']) ?? {
        email: true,
        sms: false,
        push: false,
        in_app: true,
      },
      maxPerHour: row.max_per_hour != null ? Number(row.max_per_hour) : 10,
      blackoutStart: row.blackout_start ? String(row.blackout_start) : null,
      blackoutEnd: row.blackout_end ? String(row.blackout_end) : null,
      eventPreferences: (eventPrefs as Record<string, boolean>) ?? {},
      fallbackToEmail: eventPrefs.fallbackToEmail !== false,
    }
  },

  updatePreferences: async (
    userId: string,
    prefs: Partial<NotificationUserPreferences>
  ): Promise<NotificationUserPreferences> => {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured')
    const { data: existing } = await supabase
      .from('notification_user_preferences')
      .select('event_preferences')
      .eq('user_id', userId)
      .maybeSingle()

    const currentEventPrefs = (existing?.event_preferences as Record<string, unknown>) ?? {}
    const eventPreferences = {
      ...currentEventPrefs,
      ...(prefs.eventPreferences ?? {}),
      ...(prefs.fallbackToEmail !== undefined && { fallbackToEmail: prefs.fallbackToEmail }),
    }

    const { data, error } = await supabase
      .from('notification_user_preferences')
      .upsert(
        {
          user_id: userId,
          channels_enabled: prefs.channelsEnabled ?? {},
          max_per_hour: prefs.maxPerHour ?? 10,
          blackout_start: prefs.blackoutStart ?? null,
          blackout_end: prefs.blackoutEnd ?? null,
          event_preferences: eventPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    const row = (data ?? {}) as Record<string, unknown>
    const newEventPrefs = (row.event_preferences as Record<string, unknown>) ?? {}
    return {
      channelsEnabled: (row.channels_enabled as NotificationUserPreferences['channelsEnabled']) ?? {},
      maxPerHour: row.max_per_hour != null ? Number(row.max_per_hour) : 10,
      blackoutStart: row.blackout_start ? String(row.blackout_start) : null,
      blackoutEnd: row.blackout_end ? String(row.blackout_end) : null,
      eventPreferences: (newEventPrefs as Record<string, boolean>) ?? {},
      fallbackToEmail: newEventPrefs.fallbackToEmail !== false,
    }
  },

  /** Get notifications for current user (in-app) */
  getMyNotifications: async (limit = 50): Promise<Notification[]> => {
    if (!isSupabaseConfigured()) return []
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Record<string, unknown>[]
    return Array.isArray(rows) ? rows.map(mapNotificationRow) : []
  },
}
