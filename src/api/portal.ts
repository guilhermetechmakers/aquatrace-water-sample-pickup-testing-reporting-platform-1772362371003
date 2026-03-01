/**
 * Customer Portal API - Reports, invoices, share links, attachments, reissue, audit
 * Multi-tenant data isolation via customer_id (tenant_id)
 */

import { supabase } from '@/lib/supabase'
import type {
  ShareLink,
  ShareLinkCreatePayload,
  PortalInvoice,
  PortalNotification,
  PortalAuditEntry,
  PortalInvitation,
  SupportTicket,
} from '@/types/portal'
import type { ReportAttachment } from '@/types/reports'
import { getReportPdfSignedUrl } from '@/api/reports'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Get customer ID for current user (tenant) */
export async function getCustomerIdForUser(userId: string | null): Promise<string | null> {
  if (!isSupabaseConfigured() || !userId) return null
  const { data } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

/** List reports for customer portal with filters */
export async function fetchPortalReports(
  customerId: string | null,
  filters?: { dateFrom?: string; dateTo?: string; status?: string; search?: string; testType?: string; page?: number; limit?: number }
): Promise<{ reports: Array<Record<string, unknown>>; count: number }> {
  if (!isSupabaseConfigured() || !customerId) return { reports: [], count: 0 }

  let q = supabase
    .from('reports')
    .select('id, report_id, customer_id, pickup_id, result_id, status, created_at', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom)
  if (filters?.dateTo) q = q.lte('created_at', filters.dateTo)
  if (filters?.status) q = q.eq('status', filters.status)

  const page = Math.max(1, filters?.page ?? 1)
  const limit = Math.min(50, Math.max(10, filters?.limit ?? 20))
  q = q.range((page - 1) * limit, page * limit - 1)

  const { data: rows, error, count } = await q
  if (error) return { reports: [], count: 0 }
  const list = rows ?? []
  const reports = Array.isArray(list) ? list : []

  const enriched = await Promise.all(
    reports.map(async (r: Record<string, unknown>) => {
      const reportUuid = (r.id as string) ?? ''
      const resultId = (r.result_id as string) ?? null

      const { data: versionRow } = await supabase
        .from('report_versions')
        .select('pdf_storage_path, version')
        .eq('report_id', reportUuid)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      const storagePath = versionRow ? (versionRow as { pdf_storage_path?: string }).pdf_storage_path : null
      let pdfUrl: string | null = null
      if (storagePath) pdfUrl = await getReportPdfSignedUrl(storagePath)

      const { data: pickupRow } = await supabase
        .from('pickups')
        .select('location, sample_id')
        .eq('id', r.pickup_id)
        .maybeSingle()

      /** Derive test_types from lab_results (SPC, Total Coliform) */
      let testTypes: string[] = []
      if (resultId) {
        const { data: labRow } = await supabase
          .from('lab_results')
          .select('spc_unit, total_coliform_unit')
          .eq('id', resultId)
          .maybeSingle()
        if (labRow) {
          const row = labRow as { spc_unit?: string; total_coliform_unit?: string }
          if (row.spc_unit) testTypes.push('SPC')
          if (row.total_coliform_unit) testTypes.push('Total Coliform')
          if (testTypes.length === 0) testTypes = ['Standard']
        }
      }

      /** Lab manager approval from report_signatures */
      let labApproval: string | null = null
      const { data: sigRow } = await supabase
        .from('report_signatures')
        .select('signer_role, signer_name, signed_at')
        .eq('report_id', reportUuid)
        .order('signed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sigRow) {
        const s = sigRow as { signer_role?: string; signer_name?: string }
        labApproval = s.signer_name ?? s.signer_role ?? 'Approved'
      }

      return {
        ...r,
        report_id: r.report_id,
        pdf_link: pdfUrl,
        pickup: pickupRow ? { location: (pickupRow as { location?: string }).location, sampleId: (pickupRow as { sample_id?: string }).sample_id } : null,
        version: versionRow ? (versionRow as { version?: number }).version : null,
        test_types: testTypes,
        lab_approval: labApproval,
      } as Record<string, unknown>
    })
  )

  let filtered = enriched
  if (filters?.search?.trim()) {
    const term = filters.search.toLowerCase()
    filtered = enriched.filter(
      (r: Record<string, unknown>) =>
        String((r.report_id as string) ?? '').toLowerCase().includes(term) ||
        String((r.pickup as { location?: string })?.location ?? '').toLowerCase().includes(term) ||
        String((r.pickup as { sampleId?: string })?.sampleId ?? '').toLowerCase().includes(term)
    )
  }
  if (filters?.testType?.trim()) {
    const tt = filters.testType.toLowerCase()
    filtered = filtered.filter((r: Record<string, unknown>) => {
      const types = (r.test_types as string[]) ?? []
      return types.some((t) => t.toLowerCase().includes(tt))
    })
  }
  if (filtered !== enriched) {
    return { reports: filtered, count: filtered.length }
  }
  return { reports: enriched, count: count ?? enriched.length }
}

/** List invoices for customer portal */
export async function fetchPortalInvoices(
  customerId: string | null,
  filters?: { dateFrom?: string; dateTo?: string; status?: string; search?: string; page?: number; limit?: number }
): Promise<{ invoices: PortalInvoice[]; count: number }> {
  if (!isSupabaseConfigured() || !customerId) return { invoices: [], count: 0 }

  let q = supabase
    .from('invoices')
    .select('id, invoice_id, customer_id, date, amount, status, pdf_path, created_at', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('date', { ascending: false })

  if (filters?.dateFrom) q = q.gte('date', filters.dateFrom)
  if (filters?.dateTo) q = q.lte('date', filters.dateTo)
  if (filters?.status) q = q.eq('status', filters.status)

  const page = Math.max(1, filters?.page ?? 1)
  const limit = Math.min(50, Math.max(10, filters?.limit ?? 20))
  q = q.range((page - 1) * limit, page * limit - 1)

  const { data: rows, error, count } = await q
  if (error) return { invoices: [], count: 0 }
  const list = rows ?? []
  const rawInvoices = Array.isArray(list) ? list : []

  const invoices: PortalInvoice[] = await Promise.all(
    rawInvoices.map(async (r: Record<string, unknown>) => {
      const amount = typeof r.amount === 'number' ? r.amount : parseFloat(String(r.amount ?? 0)) || 0
      const date = (r.date as string) ?? (r.created_at as string) ?? ''
      const pdfPath = (r.pdf_path as string) ?? null
      let pdfLink: string | null = null
      if (pdfPath) {
        try {
          const { data } = await supabase.storage.from('invoices').createSignedUrl(pdfPath, 3600)
          pdfLink = data?.signedUrl ?? null
        } catch {
          // Fallback: try reports bucket if invoices bucket doesn't exist
          try {
            const { data } = await supabase.storage.from('reports').createSignedUrl(pdfPath, 3600)
            pdfLink = data?.signedUrl ?? null
          } catch {
            // Ignore
          }
        }
      }
      return {
        id: (r.id as string) ?? '',
        tenantId: customerId,
        customerId: (r.customer_id as string) ?? customerId,
        invoiceNumber: (r.invoice_id as string) ?? (r.id as string)?.slice(0, 12) ?? '',
        amount,
        currency: 'USD',
        status: mapInvoiceStatus((r.status as string) ?? 'pending'),
        dueDate: date,
        pdfPath: pdfPath ?? undefined,
        pdfLink,
        createdAt: (r.created_at as string) ?? '',
      } as PortalInvoice
    })
  )

  if (filters?.search?.trim()) {
    const term = filters.search.toLowerCase()
    const filtered = invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(term) ||
        String(inv.amount).includes(term)
    )
    return { invoices: filtered, count: filtered.length }
  }

  return { invoices, count: count ?? invoices.length }
}

function mapInvoiceStatus(s: string): PortalInvoice['status'] {
  const lower = (s ?? '').toLowerCase()
  if (['draft', 'pending', 'paid', 'overdue'].includes(lower)) return lower as PortalInvoice['status']
  return 'pending'
}

/** Create share link */
export async function createShareLink(
  customerId: string | null,
  payload: ShareLinkCreatePayload
): Promise<ShareLink | null> {
  if (!isSupabaseConfigured() || !customerId) return null

  const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
  const expiresInHours = payload.expiresInHours ?? 24
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      tenant_id: customerId,
      target_type: payload.targetType,
      target_id: payload.targetId,
      token,
      expires_at: expiresAt,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })
    .select()
    .single()

  if (error) return null
  return rowToShareLink(data as Record<string, unknown>)
}

function rowToShareLink(row: Record<string, unknown>): ShareLink {
  return {
    id: (row.id as string) ?? '',
    tenantId: (row.tenant_id as string) ?? '',
    targetType: (row.target_type as ShareLink['targetType']) ?? 'report',
    targetId: (row.target_id as string) ?? '',
    token: (row.token as string) ?? '',
    expiresAt: (row.expires_at as string) ?? '',
    createdBy: (row.created_by as string) ?? null,
    usageCount: (row.usage_count as number) ?? 0,
    revokedAt: (row.revoked_at as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
  }
}

/** List share links for tenant */
export async function fetchShareLinks(
  customerId: string | null,
  targetType?: 'report' | 'invoice'
): Promise<ShareLink[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  let q = supabase
    .from('share_links')
    .select('*')
    .eq('tenant_id', customerId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (targetType) q = q.eq('target_type', targetType)

  const { data: rows, error } = await q
  if (error) return []
  const list = rows ?? []
  return Array.isArray(list) ? list.map((r: Record<string, unknown>) => rowToShareLink(r)) : []
}

/** Revoke share link */
export async function revokeShareLink(linkId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId)
  return !error
}

/** List attachments for report with signed download URLs */
export async function fetchReportAttachments(
  reportId: string,
  customerId: string | null
): Promise<ReportAttachment[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  const { data: rows, error } = await supabase
    .from('report_attachments')
    .select('*')
    .eq('report_id', reportId)

  if (error) return []
  const list = rows ?? []
  const rawAttachments = Array.isArray(list) ? list : []

  const attachments: ReportAttachment[] = await Promise.all(
    rawAttachments.map(async (a: Record<string, unknown>) => {
      const storagePath = (a.storage_path as string) ?? ''
      let url: string | undefined
      if (storagePath) {
        try {
          const { data } = await supabase.storage.from('reports').createSignedUrl(storagePath, 3600)
          url = data?.signedUrl ?? undefined
        } catch {
          // Fallback: try attachments bucket if reports doesn't have the file
          try {
            const { data } = await supabase.storage.from('attachments').createSignedUrl(storagePath, 3600)
            url = data?.signedUrl ?? undefined
          } catch {
            // Ignore
          }
        }
      }
      return {
        id: (a.id as string) ?? '',
        filename: (a.filename as string) ?? '',
        fileType: (a.file_type as string) ?? '',
        storagePath: storagePath || undefined,
        url,
        size: (a.size_bytes as number) ?? undefined,
        hash: (a.file_hash as string) ?? undefined,
        embedded: (a.embedded as boolean) ?? false,
      }
    })
  )
  return attachments
}

/** Request reissue (creates support ticket or queues - simplified) */
export async function requestReissue(
  customerId: string | null,
  reportId: string,
  reason?: string
): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured() || !customerId) return { success: false, message: 'Not configured' }

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const { error } = await supabase.from('support_tickets').insert({
    tenant_id: customerId,
    user_id: userId,
    subject: `Reissue request for report ${reportId}`,
    description: reason ?? 'Customer requested report reissue',
    status: 'open',
    report_id: reportId,
    metadata: { type: 'reissue_request' },
  })

  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Reissue request submitted' }
}

/** Log report download (call when user downloads PDF) */
export async function logReportDownloaded(
  customerId: string | null,
  reportId: string
): Promise<void> {
  await logPortalAudit(customerId, 'report_downloaded', 'report', reportId)
}

/** Log invoice view (call when user views invoice PDF) */
export async function logInvoiceViewed(
  customerId: string | null,
  invoiceId: string
): Promise<void> {
  await logPortalAudit(customerId, 'invoice_viewed', 'invoice', invoiceId)
}

/** Log portal audit event */
export async function logPortalAudit(
  customerId: string | null,
  action: string,
  itemType: string,
  itemId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured() || !customerId) return
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  await supabase.from('portal_audit_log').insert({
    tenant_id: customerId,
    user_id: userId,
    action,
    item_type: itemType,
    item_id: itemId ?? null,
    metadata: metadata ?? {},
  })
}

/** Fetch notifications for user/tenant */
export async function fetchPortalNotifications(
  customerId: string | null,
  userId?: string | null
): Promise<PortalNotification[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  let q = supabase
    .from('portal_notifications')
    .select('*')
    .eq('tenant_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (userId) {
    q = q.or(`user_id.eq.${userId},user_id.is.null`)
  }

  const { data: rows, error } = await q
  if (error) return []
  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        tenantId: (r.tenant_id as string) ?? '',
        userId: (r.user_id as string) ?? '',
        type: (r.type as PortalNotification['type']) ?? 'new_report',
        title: (r.title as string) ?? '',
        body: (r.body as string) ?? null,
        link: (r.link as string) ?? null,
        readAt: (r.read_at as string) ?? null,
        createdAt: (r.created_at as string) ?? '',
      }))
    : []
}

/** Mark notification as read */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('portal_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  return !error
}

/** Fetch audit log for tenant */
export async function fetchPortalAudit(
  customerId: string | null,
  since?: string,
  limit = 50
): Promise<PortalAuditEntry[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  let q = supabase
    .from('portal_audit_log')
    .select('*')
    .eq('tenant_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (since) q = q.gte('created_at', since)

  const { data: rows, error } = await q
  if (error) return []
  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        tenantId: (r.tenant_id as string) ?? '',
        userId: (r.user_id as string) ?? null,
        action: (r.action as string) ?? '',
        itemType: (r.item_type as string) ?? '',
        itemId: (r.item_id as string) ?? null,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
        createdAt: (r.created_at as string) ?? '',
      }))
    : []
}

/** Create invitation for customer org */
export async function createInvitation(
  customerId: string | null,
  email: string,
  role: 'CUSTOMER_VIEW' | 'ADMIN' = 'CUSTOMER_VIEW'
): Promise<PortalInvitation | null> {
  if (!isSupabaseConfigured() || !customerId) return null

  const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null

  const { data, error } = await supabase
    .from('portal_invitations')
    .insert({
      tenant_id: customerId,
      email: email.trim().toLowerCase(),
      role,
      token,
      expires_at: expiresAt,
      status: 'pending',
      created_by: userId,
    })
    .select()
    .single()

  if (error) return null
  const row = data as Record<string, unknown>
  return {
    id: (row.id as string) ?? '',
    tenantId: (row.tenant_id as string) ?? '',
    email: (row.email as string) ?? '',
    role: (row.role as string) ?? 'CUSTOMER_VIEW',
    token: (row.token as string) ?? '',
    expiresAt: (row.expires_at as string) ?? '',
    status: (row.status as PortalInvitation['status']) ?? 'pending',
    createdBy: (row.created_by as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
  }
}

/** Fetch invitations for tenant */
export async function fetchInvitations(
  customerId: string | null
): Promise<PortalInvitation[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  const { data: rows, error } = await supabase
    .from('portal_invitations')
    .select('*')
    .eq('tenant_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []
  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        tenantId: (r.tenant_id as string) ?? '',
        email: (r.email as string) ?? '',
        role: (r.role as string) ?? 'CUSTOMER_VIEW',
        token: (r.token as string) ?? '',
        expiresAt: (r.expires_at as string) ?? '',
        status: (r.status as PortalInvitation['status']) ?? 'pending',
        createdBy: (r.created_by as string) ?? null,
        createdAt: (r.created_at as string) ?? '',
      }))
    : []
}

/** Create support ticket */
export async function createSupportTicket(
  customerId: string | null,
  subject: string,
  description?: string,
  reportId?: string | null
): Promise<SupportTicket | null> {
  if (!isSupabaseConfigured() || !customerId) return null

  const userId = (await supabase.auth.getUser()).data.user?.id ?? null
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      tenant_id: customerId,
      user_id: userId,
      subject,
      description: description ?? null,
      status: 'open',
      report_id: reportId ?? null,
    })
    .select()
    .single()

  if (error) return null
  const row = data as Record<string, unknown>
  return {
    id: (row.id as string) ?? '',
    tenantId: (row.tenant_id as string) ?? '',
    userId: (row.user_id as string) ?? null,
    subject: (row.subject as string) ?? '',
    description: (row.description as string) ?? null,
    status: (row.status as SupportTicket['status']) ?? 'open',
    reportId: (row.report_id as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  }
}
