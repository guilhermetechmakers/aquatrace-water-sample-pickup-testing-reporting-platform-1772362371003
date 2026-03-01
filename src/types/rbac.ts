export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'execute'
export type Action = PermissionAction
export type PermissionScope = 'global' | 'owner' | 'ownReport' | 'organization'

export type Resource =
  | 'pickup'
  | 'lab_results'
  | 'lab_queue'
  | 'reports'
  | 'approvals'
  | 'admin_ui'
  | 'roles'
  | 'users'
  | 'audit'
  | 'technician_dashboard'
  | 'customer_portal'
  | 'customers'
  | 'invoicing'
  | 'analytics'
  | 'search'
  | 'attachments'
  | 'data_export_import'

export interface Permission {
  id: string
  role_id: string
  resource: Resource
  action: PermissionAction
  scope: PermissionScope
}

/** Simplified permission for matrix (no id/role_id) */
export interface PermissionMatrixEntry {
  resource: Resource
  action: PermissionAction
  scope: PermissionScope
}

export interface AuditLog {
  id: string
  action: string
  actor_id: string | null
  target_type: string
  target_id: string | null
  payload_diff?: Record<string, unknown>
  timestamp: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface RoleChangeAudit {
  id: string
  actor_id: string | null
  target_user_id: string | null
  from_role: string | null
  to_role: string
  reason: string | null
  created_at: string
}

export interface AccessAuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export interface Pickup {
  id: string
  technician_id: string
  customer_id: string | null
  location: string
  gps_lat: number | null
  gps_lng: number | null
  readings: Record<string, unknown>
  photos: string[]
  status: 'scheduled' | 'in_progress' | 'completed'
  scheduled_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface LabResult {
  id: string
  pickup_id: string
  spc: number | null
  total_coliform: number | null
  approved_by: string | null
  approved_at: string | null
  pdf_link: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface CustomerReport {
  id: string
  customer_id: string
  pickup_id: string
  lab_result_id: string | null
  pdf_link: string | null
  distributed_at: string | null
  created_at: string
}

export interface ProfileWithRole {
  id: string
  email: string
  display_name: string
  role: string
  role_id: string | null
  status: string
  last_login: string | null
  invited_at: string | null
}

/** Permission string format: resource:action */
export type PermissionString = `${Resource}:${PermissionAction}`
