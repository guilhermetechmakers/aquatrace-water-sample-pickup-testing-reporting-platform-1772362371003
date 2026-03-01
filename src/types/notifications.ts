/**
 * Notification & Alerts types for AquaTrace
 */

export type NotificationEventType =
  | 'pickup_assigned'
  | 'pickup_completed'
  | 'lab_results_ready'
  | 'approval_needed'
  | 'invoice_created'
  | 'invoice_paid'
  | 'sla_breach'
  | 'verification'
  | 'report_delivery'

export type NotificationChannelType = 'email' | 'sms' | 'push' | 'in_app'

export type NotificationStatusType =
  | 'queued'
  | 'in_progress'
  | 'delivered'
  | 'failed'
  | 'deprecated'

export interface NotificationChannel {
  id: string
  userId: string
  email: string | null
  phone: string | null
  pushToken: string | null
  preferredChannel: NotificationChannelType[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationTemplate {
  id: string
  name: string
  language: string
  subject: string | null
  htmlBody: string | null
  textBody: string | null
  version: number
  isPublished: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  eventType: NotificationEventType
  recipientUserId: string
  channel: NotificationChannelType
  status: NotificationStatusType
  attemptCount: number
  maxAttempts: number
  lastAttemptAt: string | null
  payload: Record<string, unknown>
  templateId: string | null
  failReason: string | null
  isDeadLetter: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationStatusResponse {
  id: string
  status: NotificationStatusType
  lastAttemptAt: string | null
  attemptCount: number
  failures: Array<{ time: string; reason: string }>
}

export interface NotificationUserPreferences {
  channelsEnabled: {
    email?: boolean
    sms?: boolean
    push?: boolean
    in_app?: boolean
  }
  maxPerHour?: number
  blackoutStart?: string | null
  blackoutEnd?: string | null
  eventPreferences?: Record<string, boolean>
  fallbackToEmail?: boolean
}

export interface NotificationWebhook {
  id: string
  url: string
  eventsEnabled: string[]
  retries: number
  timeoutSeconds: number
  createdAt: string
}

export interface NotificationAuditFilters {
  dateFrom?: string
  dateTo?: string
  eventType?: NotificationEventType
  status?: NotificationStatusType
}

export interface NotificationAuditMetrics {
  totalSent: number
  totalFailed: number
  totalQueued: number
  deadLetterCount: number
  byEventType: Record<string, number>
  byChannel: Record<string, number>
}

export interface EnqueueEventPayload {
  event_type: NotificationEventType
  payload: Record<string, unknown>
}

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  pickup_assigned: 'Pickup Assigned',
  pickup_completed: 'Pickup Completed',
  lab_results_ready: 'Lab Results Ready',
  approval_needed: 'Approval Needed',
  invoice_created: 'Invoice Created',
  invoice_paid: 'Invoice Paid',
  sla_breach: 'SLA Breach',
  verification: 'Email Verification',
  report_delivery: 'Report Delivery',
}

export const TEMPLATE_PLACEHOLDERS = [
  'customerName',
  'invoiceId',
  'pickupId',
  'labResults',
  'dueDate',
  'reportUrl',
  'technicianName',
  'sampleId',
] as const
