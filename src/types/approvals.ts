/**
 * Lab Manager Approval & Audit - Type definitions
 */

export type ApprovalStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'corrective_action'

export type AuditAction =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'signed'
  | 'corrective_action'
  | 'reassigned'
  | 'comment_added'

export interface ApprovalFile {
  id: string
  name: string
  url: string
  type: string
}

export interface ApprovalComment {
  id: string
  by: string
  role: string
  message: string
  createdAt: string
  attachments?: Array<{ id: string; name: string; url: string }>
}

export interface ApprovalAuditEntry {
  id: string
  action: AuditAction
  by: string
  at: string
  signatureId?: string
  payloadHash?: string
  details?: string
}

export interface ApprovalSignature {
  id: string
  signerName: string
  signerRole: string
  signedAt: string
  signatureData?: string
}

export interface TestResults {
  spc?: number | null
  totalColiform?: number | null
  spcUnit?: string | null
  totalColiformUnit?: string | null
  method?: string | null
  pH?: number | null
  chlorine?: number | null
}

export interface ApprovalRequest {
  id: string
  customerId: string | null
  sampleId: string
  resultId: string
  testResults: TestResults
  supportingFiles: ApprovalFile[]
  status: ApprovalStatus
  assignedTo: string | null
  slaDue: string | null
  escalationLevel: number
  auditTrail: ApprovalAuditEntry[]
  comments: ApprovalComment[]
  signature: ApprovalSignature | null
  createdAt: string
  updatedAt: string
  customerName?: string
  sampleLocation?: string
  labTechnicianName?: string
  daysInQueue?: number
}

export interface ApproveRequestPayload {
  signature: {
    signerId: string
    name: string
    role: string
    signedAt: string
    payloadHash: string
  }
  notes?: string
}

export interface RejectRequestPayload {
  reason: string
  signature?: {
    signerId: string
    signerName: string
    signerRole: string
    signatureBlob?: string
    payloadHash: string
  }
}

export interface CorrectiveActionPayload {
  description: string
  dueDate: string
  assignedTo?: string
}

export interface ReassignPayload {
  newAssigneeId: string
  message?: string
}

export interface BatchActionPayload {
  action: 'approve' | 'reject' | 'corrective_action' | 'reassign'
  ids: string[]
  notes?: string
  reassignment?: { newAssigneeId: string }
  correctiveAction?: {
    description: string
    dueDate: string
    assignedTo?: string
  }
  signature?: {
    signerId: string
    name: string
    role: string
    signedAt: string
    payloadHash: string
  }
}
