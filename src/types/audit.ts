/**
 * Audit Trail & Compliance types
 */

export type AuditActionType =
  | 'READ'
  | 'WRITE'
  | 'APPROVE'
  | 'REJECT'
  | 'DOWNLOAD'
  | 'SIGN_OFF'
  | 'EXPORT'
  | 'DISTRIBUTE'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'corrective_action'
  | 'reassigned'
  | 'comment_added'

export type AuditResourceType =
  | 'TEST_RESULT'
  | 'REPORT'
  | 'PDF'
  | 'CUSTOMER_RECORD'
  | 'PICKUP'
  | 'APPROVAL'
  | 'INVOICE'
  | string

export interface AuditEntry {
  id: string
  user_id?: string
  userId?: string
  user_name?: string
  userName?: string
  action_type?: AuditActionType | string
  actionType?: AuditActionType | string
  resource_type?: AuditResourceType
  resourceType?: AuditResourceType
  resource_id?: string
  resourceId?: string
  timestamp: string
  metadata: Record<string, unknown>
  hash: string
  previous_hash?: string
  previousHash?: string
  signature?: string
}

export interface AuditLogFilters {
  from?: string
  to?: string
  userId?: string
  actionTypes?: (AuditActionType | string)[]
  resourceTypes?: string[]
  resourceIds?: string[]
  q?: string
  page?: number
  pageSize?: number
}

export interface AuditLogResponse {
  data: AuditEntry[]
  total: number
  page: number
  pageSize: number
}

/** Alias for API consistency */
export type AuditLogsFilters = AuditLogFilters
export type AuditLogsResponse = AuditLogResponse

export interface AuditSummary {
  total: number
  byActionType: Record<string, number>
  byResourceType: Record<string, number>
  topResources: Array<{ resourceType: string; resourceId: string; count: number }>
}

export interface CreateAuditLogPayload {
  userId: string
  userName?: string
  actionType: AuditActionType | string
  resourceType: AuditResourceType
  resourceId: string
  metadata?: Record<string, unknown>
  signed?: boolean
  signature?: string
}
