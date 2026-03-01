/**
 * Lab Manager Approval & Audit API
 * Fetches approvals, performs approve/reject/corrective/reassign, audit trail, signatures
 */

import { supabase } from '@/lib/supabase'
import type {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalComment,
  ApprovalAuditEntry,
  ApprovalFile,
  TestResults,
  ApproveRequestPayload,
  RejectRequestPayload,
  CorrectiveActionPayload,
  ReassignPayload,
  BatchActionPayload,
} from '@/types/approvals'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function computePayloadHash(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload, Object.keys(payload).sort())
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h = (h << 5) - h + c
    h |= 0
  }
  return `h${Math.abs(h).toString(36)}`
}

export interface PendingApprovalsFilters {
  customerId?: string
  sampleId?: string
  status?: ApprovalStatus
  assignedTo?: string
  page?: number
  pageSize?: number
}

export interface PendingApprovalsResponse {
  data: ApprovalRequest[]
  count: number
  summary?: { inQueue: number; overdue: number; avgSlaRemaining?: number }
}

function rowToApprovalRequest(row: Record<string, unknown>): ApprovalRequest {
  const testResults = (row.test_results as Record<string, unknown>) ?? {}
  const metadata = (row.metadata as Record<string, unknown>) ?? {}
  return {
    id: (row.id as string) ?? '',
    customerId: (row.customer_id as string) ?? null,
    sampleId: (row.sample_id as string) ?? '',
    resultId: (row.result_id as string) ?? '',
    testResults: {
      spc: (testResults.spc as number) ?? null,
      totalColiform: (testResults.total_coliform as number) ?? null,
      spcUnit: (testResults.spc_unit as string) ?? null,
      totalColiformUnit: (testResults.total_coliform_unit as string) ?? null,
      method: (testResults.method as string) ?? null,
      pH: (testResults.pH as number) ?? null,
      chlorine: (testResults.chlorine as number) ?? null,
    },
    supportingFiles: [],
    status: (row.status as ApprovalRequest['status']) ?? 'pending',
    assignedTo: (row.assigned_to as string) ?? null,
    slaDue: (row.sla_due as string) ?? null,
    escalationLevel: (row.escalation_level as number) ?? 0,
    auditTrail: [],
    comments: [],
    signature: null,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
    customerName: (metadata.customer_name as string) ?? undefined,
    sampleLocation: (metadata.sample_location as string) ?? undefined,
    labTechnicianName: (metadata.lab_technician_name as string) ?? undefined,
    daysInQueue: (metadata.days_in_queue as number) ?? undefined,
  }
}

/** Ensure an approval exists for a lab result; create if missing */
export async function ensureApprovalForResult(resultId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const { data: existing } = await supabase
    .from('approvals')
    .select('id')
    .eq('result_id', resultId)
    .maybeSingle()

  if (existing) return (existing as { id: string }).id

  const { data: lr } = await supabase
    .from('lab_results')
    .select('pickup_id')
    .eq('id', resultId)
    .single()

  if (!lr) return null

  const pickupId = (lr as { pickup_id: string }).pickup_id
  const { data: pickup } = await supabase
    .from('pickups')
    .select('customer_id, location')
    .eq('id', pickupId)
    .single()

  const customerId = pickup ? ((pickup as { customer_id: string }).customer_id ?? null) : null

  const { data: lrFull } = await supabase
    .from('lab_results')
    .select('spc, total_coliform, spc_unit, total_coliform_unit, method, entered_by')
    .eq('id', resultId)
    .single()

  const testResults: TestResults = lrFull
    ? {
        spc: (lrFull as { spc: number }).spc ?? null,
        totalColiform: (lrFull as { total_coliform: number }).total_coliform ?? null,
        spcUnit: (lrFull as { spc_unit: string }).spc_unit ?? null,
        totalColiformUnit: (lrFull as { total_coliform_unit: string }).total_coliform_unit ?? null,
        method: (lrFull as { method: string }).method ?? null,
      }
    : {}

  const { data: inserted, error } = await supabase
    .from('approvals')
    .insert({
      result_id: resultId,
      sample_id: pickupId,
      customer_id: customerId,
      status: 'pending',
      test_results: testResults,
      metadata: {
        sample_location: pickup ? (pickup as { location: string }).location : null,
      },
    })
    .select('id')
    .single()

  if (error) return null
  return (inserted as { id: string }).id
}

/** Sync approvals from pending lab results - creates approval records for lab_results with status pending */
export async function syncApprovalsFromLabResults(): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { data: pendingResults } = await supabase
    .from('lab_results')
    .select('id')
    .in('status', ['pending', 'validated', 'flagged'])

  const results = pendingResults ?? []
  const ids = Array.isArray(results) ? results.map((r: { id: string }) => r.id) : []
  for (const resultId of ids) {
    await ensureApprovalForResult(resultId)
  }
}

/** Fetch pending approvals for Lab Manager Dashboard */
export async function fetchPendingApprovals(
  filters?: PendingApprovalsFilters
): Promise<PendingApprovalsResponse> {
  if (!isSupabaseConfigured()) {
    const mock: ApprovalRequest[] = []
    return { data: mock, count: 0, summary: { inQueue: 0, overdue: 0 } }
  }

  await syncApprovalsFromLabResults()

  let q = supabase
    .from('approvals')
    .select('*')
    .in('status', ['pending', 'under_review', 'corrective_action'])
    .order('created_at', { ascending: false })

  if (filters?.customerId) q = q.eq('customer_id', filters.customerId)
  if (filters?.sampleId) q = q.eq('sample_id', filters.sampleId)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo)

  const page = filters?.page ?? 1
  const pageSize = Math.min(filters?.pageSize ?? 50, 100)
  q = q.range((page - 1) * pageSize, page * pageSize - 1)

  const { data: rows, error } = await q
  if (error) return { data: [], count: 0, summary: { inQueue: 0, overdue: 0 } }

  const rawList = rows ?? []
  const list = Array.isArray(rawList) ? rawList : []
  const sampleIds = [...new Set(list.map((r: Record<string, unknown>) => r.sample_id as string).filter(Boolean))]
  const resultIds = [...new Set(list.map((r: Record<string, unknown>) => r.result_id as string).filter(Boolean))]

  let pickupsMap: Record<string, { location?: string }> = {}
  let resultsMap: Record<string, { spc?: number; total_coliform?: number; spc_unit?: string; total_coliform_unit?: string; method?: string }> = {}

  if (sampleIds.length > 0) {
    const { data: pickupsData } = await supabase.from('pickups').select('id, location').in('id', sampleIds)
    const pickups = pickupsData ?? []
    for (const p of Array.isArray(pickups) ? pickups : []) {
      const row = p as { id: string; location?: string }
      pickupsMap[row.id] = { location: row.location }
    }
  }
  if (resultIds.length > 0) {
    const { data: resultsData } = await supabase.from('lab_results').select('id, spc, total_coliform, spc_unit, total_coliform_unit, method').in('id', resultIds)
    const results = resultsData ?? []
    for (const r of Array.isArray(results) ? results : []) {
      const row = r as { id: string; spc?: number; total_coliform?: number; spc_unit?: string; total_coliform_unit?: string; method?: string }
      resultsMap[row.id] = row
    }
  }

  const approvals: ApprovalRequest[] = list.map((r: Record<string, unknown>) => {
    const a = rowToApprovalRequest(r)
    const sid = (r.sample_id as string) ?? ''
    const rid = (r.result_id as string) ?? ''
    const pickup = pickupsMap[sid]
    const lr = resultsMap[rid]
    if (pickup) a.sampleLocation = pickup.location ?? a.sampleLocation
    if (lr) {
      a.testResults = {
        ...a.testResults,
        spc: lr.spc ?? a.testResults.spc,
        totalColiform: lr.total_coliform ?? a.testResults.totalColiform,
        spcUnit: lr.spc_unit ?? a.testResults.spcUnit,
        totalColiformUnit: lr.total_coliform_unit ?? a.testResults.totalColiformUnit,
        method: lr.method ?? a.testResults.method,
      }
    }
    const created = new Date(a.createdAt)
    a.daysInQueue = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000))
    return a
  })

  const { count } = await supabase
    .from('approvals')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'under_review', 'corrective_action'])
  const totalCount = count ?? 0

  const overdue = approvals.filter((a) => {
    if (!a.slaDue) return false
    return new Date(a.slaDue) < new Date()
  }).length

  return {
    data: approvals,
    count: totalCount,
    summary: { inQueue: totalCount, overdue },
  }
}

/** Fetch single approval by ID with full details */
export async function fetchApproval(id: string): Promise<ApprovalRequest | null> {
  if (!isSupabaseConfigured()) return null

  const { data: row, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !row) return null

  const approval = rowToApprovalRequest(row as Record<string, unknown>)

  const [commentsRes, auditRes, signaturesRes, filesRes, resultAttachmentsRes] = await Promise.all([
    supabase.from('approvals_comments').select('*').eq('approval_id', id).order('created_at', { ascending: true }),
    supabase.from('approvals_audit').select('*').eq('approval_id', id).order('at', { ascending: false }),
    supabase.from('approvals_signatures').select('*').eq('approval_id', id).order('signed_at', { ascending: false }).limit(1),
    supabase.from('approvals_files').select('*').eq('approval_id', id),
    supabase.from('result_attachments').select('*').eq('result_id', approval.resultId),
  ])

  const commentsRaw = commentsRes.data ?? []
  approval.comments = Array.isArray(commentsRaw)
    ? commentsRaw.map((c: Record<string, unknown>) => ({
        id: (c.id as string) ?? '',
        by: (c.by_user_id as string) ?? '',
        role: (c.role as string) ?? '',
        message: (c.message as string) ?? '',
        createdAt: (c.created_at as string) ?? '',
      }))
    : []

  const auditRaw = auditRes.data ?? []
  approval.auditTrail = Array.isArray(auditRaw)
    ? auditRaw.map((a: Record<string, unknown>) => ({
        id: (a.id as string) ?? '',
        action: (a.action as ApprovalAuditEntry['action']) ?? 'created',
        by: (a.by_user_id as string) ?? '',
        at: (a.at as string) ?? '',
        signatureId: (a.signature_id as string) ?? undefined,
        payloadHash: (a.payload_hash as string) ?? undefined,
        details: (a.details as string) ?? undefined,
      }))
    : []

  const sigsRaw = signaturesRes.data ?? []
  const latestSig = Array.isArray(sigsRaw) ? sigsRaw[0] : null
  if (latestSig) {
    const s = latestSig as Record<string, unknown>
    approval.signature = {
      id: (s.id as string) ?? '',
      signerName: (s.signer_name as string) ?? '',
      signerRole: (s.signer_role as string) ?? '',
      signedAt: (s.signed_at as string) ?? '',
      signatureData: (s.signature_blob as string) ?? undefined,
    }
  }

  const filesRaw = filesRes.data ?? []
  const resultAttRaw = resultAttachmentsRes.data ?? []
  const allFiles: ApprovalFile[] = []

  if (Array.isArray(filesRaw)) {
    for (const f of filesRaw) {
      const r = f as Record<string, unknown>
      allFiles.push({
        id: (r.id as string) ?? '',
        name: (r.file_name as string) ?? '',
        url: (r.url as string) ?? '',
        type: (r.file_type as string) ?? '',
      })
    }
  }

  if (Array.isArray(resultAttRaw)) {
    for (const a of resultAttRaw) {
      const r = a as Record<string, unknown>
      const storagePath = (r.storage_path as string) ?? ''
      let url = storagePath
      try {
        const pathInBucket = storagePath.startsWith('lab-attachments/') ? storagePath.slice('lab-attachments/'.length) : storagePath
        const { data: urlData } = await supabase.storage.from('lab-attachments').createSignedUrl(pathInBucket || storagePath, 3600)
        url = urlData?.signedUrl ?? storagePath
      } catch {
        url = storagePath
      }
      allFiles.push({
        id: (r.id as string) ?? '',
        name: (r.file_name as string) ?? '',
        url,
        type: (r.mime_type as string) ?? 'application/octet-stream',
      })
    }
  }

  approval.supportingFiles = allFiles

  const created = new Date(approval.createdAt)
  approval.daysInQueue = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000))

  return approval
}

/** Approve an approval request */
export async function approveApproval(
  id: string,
  payload: ApproveRequestPayload,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const payloadHash = computePayloadHash(payload.signature as unknown as Record<string, unknown>)

  const { data: sig, error: sigErr } = await supabase
    .from('approvals_signatures')
    .insert({
      approval_id: id,
      signer_id: payload.signature.signerId,
      signer_name: payload.signature.name,
      signer_role: payload.signature.role,
      signed_at: payload.signature.signedAt,
      payload_hash: payloadHash,
    })
    .select('id')
    .single()

  if (sigErr) throw new Error(sigErr.message)

  const sigId = (sig as { id: string }).id

  const { data: app } = await supabase.from('approvals').select('result_id').eq('id', id).single()
  const resultId = app ? (app as { result_id: string }).result_id : null

  await supabase
    .from('approvals')
    .update({ status: 'approved', assigned_to: userId, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (resultId) {
    await supabase.from('lab_results').update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    }).eq('id', resultId)
  }

  await supabase.from('approvals_audit').insert({
    approval_id: id,
    action: 'approved',
    by_user_id: userId,
    details: payload.notes ?? null,
    signature_id: sigId,
    payload_hash: payloadHash,
  })
}

/** Reject an approval request */
export async function rejectApproval(
  id: string,
  payload: RejectRequestPayload,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  let sigId: string | null = null
  let payloadHash: string | null = null

  if (payload.signature) {
    payloadHash = computePayloadHash(payload.signature as unknown as Record<string, unknown>)
    const { data: sig, error: sigErr } = await supabase
      .from('approvals_signatures')
      .insert({
        approval_id: id,
        signer_id: payload.signature.signerId,
        signer_name: payload.signature.signerName,
        signer_role: payload.signature.signerRole,
        signed_at: new Date().toISOString(),
        signature_blob: payload.signature.signatureBlob ?? null,
        payload_hash: payloadHash,
      })
      .select('id')
      .single()
    if (!sigErr && sig) sigId = (sig as { id: string }).id
  }

  await supabase
    .from('approvals')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id)

  const { data: app } = await supabase.from('approvals').select('result_id').eq('id', id).single()
  if (app) {
    await supabase.from('lab_results').update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    }).eq('id', (app as { result_id: string }).result_id)
  }

  await supabase.from('approvals_audit').insert({
    approval_id: id,
    action: 'rejected',
    by_user_id: userId,
    details: payload.reason,
    signature_id: sigId,
    payload_hash: payloadHash ?? '',
  })
}

/** Request corrective action */
export async function requestCorrectiveAction(
  id: string,
  payload: CorrectiveActionPayload,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  await supabase
    .from('approvals')
    .update({ status: 'corrective_action', assigned_to: payload.assignedTo ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)

  await supabase.from('approvals_corrective_actions').insert({
    approval_id: id,
    description: payload.description,
    due_date: payload.dueDate,
    assigned_to: payload.assignedTo ?? null,
    created_by: userId,
  })

  await supabase.from('approvals_audit').insert({
    approval_id: id,
    action: 'corrective_action',
    by_user_id: userId,
    details: payload.description,
  })
}

/** Reassign approval to another manager */
export async function reassignApproval(
  id: string,
  payload: ReassignPayload,
  userId: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  await supabase
    .from('approvals')
    .update({ assigned_to: payload.newAssigneeId, updated_at: new Date().toISOString() })
    .eq('id', id)

  await supabase.from('approvals_audit').insert({
    approval_id: id,
    action: 'reassigned',
    by_user_id: userId,
    details: payload.message ?? `Reassigned to ${payload.newAssigneeId}`,
  })
}

/** Add a comment to an approval */
export async function addApprovalComment(
  id: string,
  message: string,
  userId: string,
  role?: string
): Promise<ApprovalComment> {
  if (!isSupabaseConfigured()) {
    return {
      id: `c-${Date.now()}`,
      by: userId,
      role: role ?? '',
      message,
      createdAt: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('approvals_comments')
    .insert({
      approval_id: id,
      by_user_id: userId,
      role: role ?? null,
      message,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const r = data as Record<string, unknown>
  const comment: ApprovalComment = {
    id: (r.id as string) ?? '',
    by: (r.by_user_id as string) ?? '',
    role: (r.role as string) ?? '',
    message: (r.message as string) ?? '',
    createdAt: (r.created_at as string) ?? '',
  }

  await supabase.from('approvals_audit').insert({
    approval_id: id,
    action: 'comment_added',
    by_user_id: userId,
    details: message.slice(0, 200),
  })

  return comment
}

/** Batch action on multiple approvals */
export async function batchApprovalAction(
  payload: BatchActionPayload,
  userId: string
): Promise<{ success: number; failed: string[] }> {
  const ids = payload.ids ?? []
  const safeIds = Array.isArray(ids) ? ids : []
  const failed: string[] = []

  for (const id of safeIds) {
    try {
      if (payload.action === 'approve' && payload.signature) {
        await approveApproval(
          id,
          { signature: payload.signature, notes: payload.notes },
          userId
        )
      } else if (payload.action === 'reject') {
        await rejectApproval(id, { reason: payload.notes ?? 'Batch reject' }, userId)
      } else if (payload.action === 'reassign' && payload.reassignment?.newAssigneeId) {
        await reassignApproval(
          id,
          { newAssigneeId: payload.reassignment.newAssigneeId, message: payload.notes },
          userId
        )
      } else if (payload.action === 'corrective_action' && payload.correctiveAction) {
        await requestCorrectiveAction(
          id,
          {
            description: payload.correctiveAction.description,
            dueDate: payload.correctiveAction.dueDate,
            assignedTo: payload.correctiveAction.assignedTo,
          },
          userId
        )
      }
    } catch {
      failed.push(id)
    }
  }

  return { success: safeIds.length - failed.length, failed }
}
