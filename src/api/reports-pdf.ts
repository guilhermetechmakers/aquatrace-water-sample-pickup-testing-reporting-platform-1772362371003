/**
 * PDF Report Generation & Distribution API
 * Integrates with Supabase reports tables and Edge Functions
 */

import { supabase } from '@/lib/supabase'
import type {
  Report,
  ReportVersion,
  ReportAttachment,
  ReportSignature,
  ReportAuditEntry,
  PickupData,
  LabResults,
} from '@/types/reports'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function rowToReport(row: Record<string, unknown>): Report {
  const metadata = (row.metadata as Record<string, unknown>) ?? {}
  return {
    id: (row.id as string) ?? '',
    customerId: (row.customer_id as string) ?? '',
    approvalId: (row.approval_id as string) ?? null,
    resultId: (row.result_id as string) ?? null,
    pickupId: (row.pickup_id as string) ?? null,
    reportId: (row.report_id as string) ?? '',
    currentVersion: (row.current_version as number) ?? 1,
    status: (row.status as Report['status']) ?? 'draft',
    createdAt: (row.created_at as string) ?? '',
    createdBy: (row.created_by as string) ?? null,
    customerName: (metadata.customer_name as string) ?? undefined,
    pickupData: (metadata.pickup_data as PickupData) ?? undefined,
    labResults: (metadata.lab_results as LabResults) ?? undefined,
    attachments: [],
    signature: null,
    auditTrail: [],
  }
}

/** Generate report ID string */
export function generateReportId(): string {
  return `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

/** Create or get report for approval */
export async function ensureReportForApproval(
  approvalId: string,
  customerId: string,
  resultId: string,
  pickupId: string
): Promise<Report | null> {
  if (!isSupabaseConfigured()) return null

  const { data: existing } = await supabase
    .from('reports')
    .select('*')
    .eq('approval_id', approvalId)
    .maybeSingle()

  if (existing) {
    return rowToReport(existing as Record<string, unknown>)
  }

  const customerName =
    (await supabase.from('customers').select('name').eq('id', customerId).single()).data?.name ?? null
  const pickupRow = (await supabase.from('pickups').select('*').eq('id', pickupId).single()).data as Record<string, unknown> | null
  const labRow = (await supabase.from('lab_results').select('*').eq('id', resultId).single()).data as Record<string, unknown> | null

  const metadata: Record<string, unknown> = {
    customer_name: customerName,
    pickup_data: pickupRow
      ? {
          technicianName: null,
          pickupTime: pickupRow.sample_timestamp ?? pickupRow.created_at,
          gpsLat: pickupRow.gps_lat,
          gpsLng: pickupRow.gps_lng,
          location: pickupRow.location,
          vialIds: pickupRow.vial_id ? [String(pickupRow.vial_id)] : [],
          pH: pickupRow.readings ? (pickupRow.readings as Record<string, unknown>).pH : null,
          chlorine: pickupRow.chlorine_reading ?? (pickupRow.readings ? (pickupRow.readings as Record<string, unknown>).chlorine : null),
        }
      : {},
    lab_results: labRow
      ? {
          spcResult: labRow.spc,
          totalColiformResult: labRow.total_coliform,
          spcUnit: labRow.spc_unit,
          totalColiformUnit: labRow.total_coliform_unit,
          testedAt: labRow.entered_at,
        }
      : {},
  }

  const reportId = generateReportId()
  const { data: inserted, error } = await supabase
    .from('reports')
    .insert({
      customer_id: customerId,
      approval_id: approvalId,
      result_id: resultId,
      pickup_id: pickupId,
      report_id: reportId,
      current_version: 1,
      status: 'draft',
      metadata,
    })
    .select()
    .single()

  if (error) return null
  return rowToReport((inserted ?? {}) as Record<string, unknown>)
}

/** Fetch report by approval ID */
export async function fetchReportByApprovalId(approvalId: string): Promise<Report | null> {
  if (!isSupabaseConfigured()) return null

  const { data: row } = await supabase
    .from('reports')
    .select('*')
    .eq('approval_id', approvalId)
    .maybeSingle()

  if (!row) return null
  return fetchReport((row as { id: string }).id)
}

/** Fetch report by ID with full details */
export async function fetchReport(id: string): Promise<Report | null> {
  if (!isSupabaseConfigured()) return null

  const { data: row, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !row) return null

  const report = rowToReport(row as Record<string, unknown>)

  const [, attachmentsRes, signaturesRes, auditRes] = await Promise.all([
    supabase.from('report_versions').select('*').eq('report_id', id).order('version', { ascending: false }),
    supabase.from('report_attachments').select('*').eq('report_id', id),
    supabase.from('report_signatures').select('*').eq('report_id', id).order('signed_at', { ascending: false }),
    supabase.from('report_audit').select('*').eq('report_id', id).order('performed_at', { ascending: false }),
  ])

  const attachmentsRaw = attachmentsRes.data ?? []
  const signaturesRaw = signaturesRes.data ?? []
  const auditRaw = auditRes.data ?? []

  report.attachments = Array.isArray(attachmentsRaw)
    ? attachmentsRaw.map((a: Record<string, unknown>) => ({
        id: (a.id as string) ?? '',
        filename: (a.filename as string) ?? '',
        fileType: (a.file_type as string) ?? '',
        url: (a.storage_path as string) ?? '',
        size: (a.size_bytes as number) ?? null,
        hash: (a.file_hash as string) ?? null,
        embedded: (a.embedded as boolean) ?? true,
      }))
    : []

  const latestSig = Array.isArray(signaturesRaw) ? signaturesRaw[0] : null
  if (latestSig) {
    const s = latestSig as Record<string, unknown>
    report.signature = {
      id: (s.id as string) ?? '',
      signerRole: (s.signer_role as string) ?? '',
      signerName: (s.signer_name as string) ?? '',
      signatureImageUrl: (s.signature_image_url as string) ?? null,
      signedAt: (s.signed_at as string) ?? '',
      certificateInfo: (s.certificate_info as string) ?? null,
    }
  }

  report.auditTrail = Array.isArray(auditRaw)
    ? auditRaw.map((e: Record<string, unknown>) => ({
        id: (e.id as string) ?? '',
        action: (e.action as ReportAuditEntry['action']) ?? 'created',
        performedBy: (e.performed_by as string) ?? null,
        performedAt: (e.performed_at as string) ?? '',
        note: (e.note as string) ?? null,
      }))
    : []

  return report
}

/** Fetch report versions */
export async function fetchReportVersions(reportId: string): Promise<ReportVersion[]> {
  if (!isSupabaseConfigured()) return []

  const { data } = await supabase
    .from('report_versions')
    .select('*')
    .eq('report_id', reportId)
    .order('version', { ascending: false })

  const raw = data ?? []
  return Array.isArray(raw)
    ? raw.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        reportId: (r.report_id as string) ?? '',
        version: (r.version as number) ?? 1,
        status: (r.status as ReportVersion['status']) ?? 'draft',
        pdfUrl: r.pdf_storage_path ? `storage/${r.pdf_storage_path}` : null,
        pdfHash: (r.pdf_hash as string) ?? null,
        createdAt: (r.created_at as string) ?? '',
        createdBy: (r.created_by as string) ?? null,
        generatedAt: (r.generated_at as string) ?? null,
        generatedBy: (r.generated_by as string) ?? null,
      }))
    : []
}

/** Generate PDF via Edge Function */
export async function generateReportPdf(payload: {
  reportId: string
  version: number
  customerId: string
  approvalId?: string
  pickupData?: PickupData
  labResults?: LabResults
  attachments?: ReportAttachment[]
  signatures?: ReportSignature[]
  auditTrail?: ReportAuditEntry[]
  generatedBy?: string
}): Promise<{ pdfUrl?: string; storagePath?: string; html?: string }> {
  if (!isSupabaseConfigured()) {
    return { html: '<p>Report generation requires Supabase</p>' }
  }

  const { data, error } = await supabase.functions.invoke('generate-report-pdf', {
    body: {
      reportId: payload.reportId,
      version: payload.version,
      customerId: payload.customerId,
      approvalId: payload.approvalId,
      pickupData: payload.pickupData,
      labResults: payload.labResults,
      attachments: (payload.attachments ?? []).map((a) => ({ filename: a.filename, fileType: a.fileType })),
      signatures: (payload.signatures ?? []).map((s) => ({
        signerName: s.signerName,
        signerRole: s.signerRole,
        signedAt: s.signedAt,
        signatureImageUrl: s.signatureImageUrl,
      })),
      auditMetadata: {
        entries: (payload.auditTrail ?? []).map((e) => ({
          action: e.action,
          performedBy: e.performedBy,
          performedAt: e.performedAt,
          note: e.note,
        })),
      },
      generatedBy: payload.generatedBy ?? 'System',
    },
  })

  if (error) throw new Error(error.message ?? 'PDF generation failed')

  const resp = (data as Record<string, unknown>) ?? {}
  return {
    pdfUrl: resp.pdfUrl as string | undefined,
    storagePath: resp.storagePath as string | undefined,
    html: resp.html as string | undefined,
  }
}

/** Send report email via Edge Function */
export async function sendReportEmail(payload: {
  reportId: string
  version: number
  recipient: string
  customerName?: string
  reportTitle?: string
  pickupDate?: string
  pdfUrl?: string
  portalLink?: string
}): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Report email requires Supabase')
  }

  const { data, error } = await supabase.functions.invoke('send-report-email', {
    body: payload,
  })

  if (error) throw new Error(error.message ?? 'Email send failed')

  const resp = (data as Record<string, unknown>) ?? {}
  return { success: Boolean(resp.success) }
}

/** Approve report version and optionally trigger PDF + email */
export async function approveReportVersion(
  reportId: string,
  version: number,
  userId: string,
  signature?: { signerId: string; signerName: string; signerRole: string; signedAt: string; signatureBlob?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) return

  if (signature) {
    await supabase.from('report_signatures').insert({
      report_id: reportId,
      version,
      signer_id: signature.signerId,
      signer_name: signature.signerName,
      signer_role: signature.signerRole,
      signed_at: signature.signedAt,
      signature_image_url: signature.signatureBlob ?? null,
    })
  }

  await supabase.from('report_versions').update({ status: 'approved' }).eq('report_id', reportId).eq('version', version)

  await supabase.from('reports').update({ status: 'approved', current_version: version }).eq('id', reportId)

  await supabase.from('report_audit').insert({
    report_id: reportId,
    action: 'approved',
    performed_by: userId,
    note: 'Version approved',
  })
}

/** Reissue report: create new version */
export async function reissueReport(reportId: string, userId: string): Promise<ReportVersion | null> {
  if (!isSupabaseConfigured()) return null

  const { data: report } = await supabase.from('reports').select('current_version').eq('id', reportId).single()
  const currentVersion = (report as { current_version: number } | null)?.current_version ?? 1
  const newVersion = currentVersion + 1

  const { data: inserted, error } = await supabase
    .from('report_versions')
    .insert({
      report_id: reportId,
      version: newVersion,
      status: 'draft',
      created_by: userId,
    })
    .select()
    .single()

  if (error) return null

  await supabase.from('reports').update({ current_version: newVersion }).eq('id', reportId)

  await supabase.from('report_audit').insert({
    report_id: reportId,
    action: 'reissued',
    performed_by: userId,
    note: `Reissued as v${newVersion}`,
  })

  const r = (inserted ?? {}) as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    reportId: (r.report_id as string) ?? '',
    version: (r.version as number) ?? newVersion,
    status: 'draft',
    pdfUrl: null,
    pdfHash: null,
    createdAt: (r.created_at as string) ?? '',
    createdBy: (r.created_by as string) ?? null,
    generatedAt: null,
    generatedBy: null,
  }
}

/** Get signed URL for report PDF */
export async function getReportPdfSignedUrl(reportId: string, customerId: string, version: number): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const path = `${customerId}/${reportId}/v${version}.pdf`
  const { data } = await supabase.storage.from('reports').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
