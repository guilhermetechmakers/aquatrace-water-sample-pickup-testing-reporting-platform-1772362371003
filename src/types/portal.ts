/**
 * Customer Portal & Secure Report Access - Type definitions
 */

export type ShareLinkTargetType = 'report' | 'invoice'

export interface ShareLink {
  id: string
  tenantId: string
  targetType: ShareLinkTargetType
  targetId: string
  token: string
  expiresAt: string
  createdBy: string | null
  usageCount: number
  revokedAt: string | null
  createdAt: string
}

export interface ShareLinkCreatePayload {
  targetType: ShareLinkTargetType
  targetId: string
  expiresInHours?: number
}

export interface PortalInvoice {
  id: string
  tenantId: string
  customerId: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'draft' | 'pending' | 'paid' | 'overdue'
  dueDate: string
  pdfPath?: string | null
  /** Signed URL for PDF download (populated by API) */
  pdfLink?: string | null
  createdAt: string
}

export interface PortalNotification {
  id: string
  tenantId: string
  userId: string
  type: 'new_report' | 'new_invoice' | 'reissue_ready' | 'action_required'
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export type PortalAuditAction =
  | 'report_viewed'
  | 'report_downloaded'
  | 'invoice_viewed'
  | 'invoice_downloaded'
  | 'share_link_created'
  | 'share_link_used'
  | 'reissue_requested'
  | 'support_ticket_created'

export interface PortalAuditEntry {
  id: string
  tenantId: string
  userId: string | null
  action: PortalAuditAction | string
  itemType: string
  itemId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface PortalInvitation {
  id: string
  tenantId: string
  email: string
  role: string
  token: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  createdBy: string | null
  createdAt: string
}

export interface SupportTicket {
  id: string
  tenantId: string
  userId: string | null
  subject: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  reportId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ReportFilters {
  reportId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
  testType?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
