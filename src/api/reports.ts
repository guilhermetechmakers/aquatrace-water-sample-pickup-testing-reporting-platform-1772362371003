/**
 * PDF Report Generation & Distribution API
 * Fetches reports, versions, triggers generation, reissue, email
 */

import { supabase } from '@/lib/supabase'
import type {
  Report,
  ReportVersion,
  ReportAttachment,
  ReportAuditEntry,
  ReportEmailLog,
  PickupData,
  LabResults,
  ReportSignature,
} from '@/types/reports'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''

function getSupabaseFunctionsUrl(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`
}

/** Generate report ID from approval */
export function generateReportId(approvalId: string): string {
  return `RPT-${approvalId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
}

/** Fetch list of reports for Reports page */
export async function fetchReportsList(filters?: {
  customerId?: string
  status?: string
  limit?: number
}): Promise<Report[]> {
  if (!isSupabaseConfigured()) return []

  let q = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.customerId) q = q.eq('customer_id', filters.customerId)
  if (filters?.status) q = q.eq('status', filters.status)
  const limit = Math.min(filters?.limit ?? 50, 100)
  q = q.limit(limit)

  const { data: rows, error } = await q
  if (error) return []
  const list = rows ?? []
  const reports = Array.isArray(list) ? list.map((r: Record<string, unknown>) => rowToReport(r)) : []

  const customerIds = [...new Set(reports.map((r) => r.customerId).filter(Boolean))] as string[]
  let customerMap: Record<string, string> = {}
  if (customerIds.length > 0) {
    const { data: custData } = await supabase
      .from('customers')
      .select('id, name')
      .in('id', customerIds)
    const custList = custData ?? []
    for (const c of Array.isArray(custList) ? custList : []) {
      const row = c as { id: string; name?: string }
      customerMap[row.id] = row.name ?? '—'
    }
  }
  reports.forEach((r) => {
    r.customerName = r.customerId ? customerMap[r.customerId] ?? null : null
  })
  return reports
}

/** Fetch reports by approval ID (reports.id is UUID, approval_id links to approvals) */
export async function fetchReportsByApproval(approvalId: string): Promise<Report | null> {
  if (!isSupabaseConfigured()) return null

  const { data: row, error } = await supabase
    .from('reports')
    .select('*')
    .eq('approval_id', approvalId)
    .maybeSingle()

  if (error || !row) return null

  const report = rowToReport(row as Record<string, unknown>)
  const versions = await fetchReportVersions(report.id)
  report.versions = versions ?? []

  return report
}

/** Fetch report versions for a report */
export async function fetchReportVersions(reportId: string): Promise<ReportVersion[]> {
  if (!isSupabaseConfigured()) return []

  const { data: rows, error } = await supabase
    .from('report_versions')
    .select('*')
    .eq('report_id', reportId)
    .order('version', { ascending: false })

  if (error) return []
  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => rowToReportVersion(r))
    : []
}

function rowToReport(row: Record<string, unknown>): Report {
  return {
    id: (row.id as string) ?? '',
    reportId: (row.report_id as string) ?? '',
    approvalId: (row.approval_id as string) ?? null,
    customerId: (row.customer_id as string) ?? '',
    resultId: (row.result_id as string) ?? null,
    pickupId: (row.pickup_id as string) ?? null,
    currentVersion: (row.current_version as number) ?? 1,
    status: (row.status as Report['status']) ?? 'draft',
    createdAt: (row.created_at as string) ?? '',
    createdBy: (row.created_by as string) ?? null,
    updatedAt: (row.updated_at as string) ?? null,
  }
}

function rowToReportVersion(row: Record<string, unknown>): ReportVersion {
  const storagePath = (row.pdf_storage_path as string) ?? ''
  return {
    id: (row.id as string) ?? '',
    reportId: (row.report_id as string) ?? '',
    version: (row.version as number) ?? 1,
    status: (row.status as ReportVersion['status']) ?? 'draft',
    pdfUrl: null,
    pdfStoragePath: storagePath || null,
    pdfHash: (row.pdf_hash as string) ?? null,
    generatedAt: (row.generated_at as string) ?? null,
    generatedBy: (row.generated_by as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
    createdBy: (row.created_by as string) ?? null,
  }
}

/** Fetch report with full details (versions, attachments, audit, emails) */
export async function fetchReportDetails(
  reportId: string,
  version?: number
): Promise<{
  report: Report | null
  version: ReportVersion | null
  attachments: ReportAttachment[]
  auditTrail: ReportAuditEntry[]
  emails: ReportEmailLog[]
}> {
  if (!isSupabaseConfigured()) {
    return { report: null, version: null, attachments: [], auditTrail: [], emails: [] }
  }

  const { data: reportRow, error: reportErr } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (reportErr || !reportRow) {
    return { report: null, version: null, attachments: [], auditTrail: [], emails: [] }
  }

  const report = rowToReport(reportRow as Record<string, unknown>)
  const versions = await fetchReportVersions(reportId)
  report.versions = versions ?? []

  const targetVersion = version ?? report.currentVersion
  const versionData = (versions ?? []).find((v) => v.version === targetVersion) ?? null

  const [attachmentsRes, auditRes, emailsRes] = await Promise.all([
    supabase.from('report_attachments').select('*').eq('report_id', reportId),
    supabase.from('report_audit').select('*').eq('report_id', reportId).order('performed_at', { ascending: false }),
    supabase.from('report_emails').select('*').eq('report_id', reportId).order('created_at', { ascending: false }),
  ])

  const attachmentsRaw = attachmentsRes.data ?? []
  const attachments: ReportAttachment[] = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((a: Record<string, unknown>) => ({
        id: (a.id as string) ?? '',
        filename: (a.filename as string) ?? '',
        fileType: (a.file_type as string) ?? '',
        storagePath: (a.storage_path as string) ?? undefined,
        size: (a.size_bytes as number) ?? undefined,
        hash: (a.file_hash as string) ?? undefined,
        embedded: (a.embedded as boolean) ?? false,
      }))
    : []

  const auditRaw = auditRes.data ?? []
  const auditTrail: ReportAuditEntry[] = Array.isArray(auditRaw)
    ? auditRaw.map((a: Record<string, unknown>) => ({
        id: (a.id as string) ?? '',
        action: (a.action as ReportAuditEntry['action']) ?? 'created',
        performedBy: (a.performed_by as string) ?? null,
        performedAt: (a.performed_at as string) ?? '',
        note: (a.note as string) ?? null,
      }))
    : []

  const emailsRaw = emailsRes.data ?? []
  const emails: ReportEmailLog[] = Array.isArray(emailsRaw)
    ? emailsRaw.map((e: Record<string, unknown>) => ({
        id: (e.id as string) ?? '',
        reportId: (e.report_id as string) ?? '',
        recipient: (e.recipient as string) ?? '',
        status: (e.status as ReportEmailLog['status']) ?? 'pending',
        sentAt: (e.sent_at as string) ?? null,
        response: (e.response as Record<string, unknown>) ?? null,
        createdAt: (e.created_at as string) ?? '',
      }))
    : []

  return { report, version: versionData, attachments, auditTrail, emails }
}

/** Trigger PDF generation via Edge Function */
export async function generateReportPdf(payload: {
  approvalId: string
  customerId: string
  version?: number
  pickupData: PickupData
  labResults: LabResults
  attachments?: ReportAttachment[]
  signature?: ReportSignature | null
  auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
}): Promise<{ reportId: string; version: number; pdfUrl: string } | null> {
  const token = typeof window !== 'undefined' ? (await supabase.auth.getSession()).data.session?.access_token : null
  if (!token) return null

  const url = `${getSupabaseFunctionsUrl()}/generate-report-pdf`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'PDF generation failed')
  }

  const data = (await res.json()) as { reportId?: string; version?: number; pdfUrl?: string }
  return {
    reportId: data.reportId ?? '',
    version: data.version ?? 1,
    pdfUrl: data.pdfUrl ?? '',
  }
}

/** Trigger email distribution via Edge Function */
export async function sendReportEmail(payload: {
  reportId: string
  version: number
  recipient: string
  customerName?: string
  reportTitle?: string
  pickupDate?: string
}): Promise<{ success: boolean; messageId?: string }> {
  const token = typeof window !== 'undefined' ? (await supabase.auth.getSession()).data.session?.access_token : null
  if (!token) throw new Error('Not authenticated')

  const url = `${getSupabaseFunctionsUrl()}/send-report-email`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Email send failed')
  }

  const data = (await res.json()) as { success?: boolean; messageId?: string }
  return { success: data.success ?? true, messageId: data.messageId }
}

/** Trigger reissue (create new version) via Edge Function */
export async function reissueReport(payload: {
  reportId: string
  approvalId: string
  customerId: string
  pickupData: PickupData
  labResults: LabResults
  attachments?: ReportAttachment[]
  signature?: ReportSignature | null
  auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
}): Promise<{ reportId: string; version: number; pdfUrl: string } | null> {
  const token = typeof window !== 'undefined' ? (await supabase.auth.getSession()).data.session?.access_token : null
  if (!token) return null

  const url = `${getSupabaseFunctionsUrl()}/reissue-report`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Reissue failed')
  }

  const data = (await res.json()) as { reportId?: string; version?: number; pdfUrl?: string }
  return {
    reportId: data.reportId ?? '',
    version: data.version ?? 1,
    pdfUrl: data.pdfUrl ?? '',
  }
}

/** Report with metadata for list views and customer portal */
export interface ReportWithMeta {
  id: string
  reportId?: string
  customerId: string
  pdf_link?: string | null
  created_at?: string | null
  createdAt?: string
  pickup?: { location?: string } | null
}

/** Fetch reports for customer portal (current user's customer) */
export async function fetchCustomerReports(customerId: string | null): Promise<ReportWithMeta[]> {
  if (!isSupabaseConfigured() || !customerId) return []

  const { data: rows, error } = await supabase
    .from('reports')
    .select('id, report_id, customer_id, pickup_id, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) return []
  const list = rows ?? []
  const reports: ReportWithMeta[] = []

  for (const r of Array.isArray(list) ? list : []) {
    const row = r as Record<string, unknown>
    const reportUuid = (row.id as string) ?? ''
  const { data: versionRow } = await supabase
      .from('report_versions')
      .select('pdf_storage_path')
      .eq('report_id', reportUuid)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const storagePath = versionRow ? (versionRow as { pdf_storage_path?: string }).pdf_storage_path : null
    let pdfUrl: string | null = null
    if (storagePath) {
      pdfUrl = await getReportPdfSignedUrl(storagePath)
    }

    const { data: pickupRow } = await supabase
      .from('pickups')
      .select('location')
      .eq('id', row.pickup_id)
      .single()

    reports.push({
      id: reportUuid,
      reportId: (row.report_id as string) ?? '',
      customerId: (row.customer_id as string) ?? '',
      pdf_link: pdfUrl,
      created_at: (row.created_at as string) ?? null,
      pickup: pickupRow ? { location: (pickupRow as { location?: string }).location } : undefined,
    })
  }
  return reports
}

/** Get signed URL for PDF download */
export async function getReportPdfSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  if (!storagePath) return null
  try {
    const { data, error } = await supabase.storage.from('reports').createSignedUrl(storagePath, expiresIn)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}
