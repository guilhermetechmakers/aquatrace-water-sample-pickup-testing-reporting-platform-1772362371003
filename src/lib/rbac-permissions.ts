/**
 * RBAC Permission Matrix for AquaTrace
 * Maps roles to resource:action permissions with scope
 */

import type { AuthRole } from '@/types/auth'
import type { Resource, Action, PermissionMatrixEntry } from '@/types/rbac'

const ROLE_PERMISSION_MATRIX: Record<AuthRole, PermissionMatrixEntry[]> = {
  TECHNICIAN: [
    { resource: 'pickup', action: 'read', scope: 'owner' },
    { resource: 'pickup', action: 'create', scope: 'owner' },
    { resource: 'pickup', action: 'update', scope: 'owner' },
    { resource: 'pickup', action: 'create', scope: 'owner' }, // readings
    { resource: 'pickup', action: 'create', scope: 'owner' }, // photos
  ],
  LAB_TECH: [
    { resource: 'pickup', action: 'read', scope: 'global' },
    { resource: 'lab_results', action: 'read', scope: 'global' },
    { resource: 'lab_results', action: 'create', scope: 'global' },
    { resource: 'lab_results', action: 'update', scope: 'global' },
  ],
  LAB_MANAGER: [
    { resource: 'pickup', action: 'read', scope: 'global' },
    { resource: 'lab_results', action: 'read', scope: 'global' },
    { resource: 'lab_results', action: 'create', scope: 'global' },
    { resource: 'lab_results', action: 'update', scope: 'global' },
    { resource: 'lab_results', action: 'execute', scope: 'global' }, // approve
    { resource: 'reports', action: 'read', scope: 'global' },
    { resource: 'reports', action: 'execute', scope: 'global' }, // generate PDF, distribute
  ],
  ADMIN: [
    { resource: 'pickup', action: 'read', scope: 'global' },
    { resource: 'pickup', action: 'create', scope: 'global' },
    { resource: 'pickup', action: 'update', scope: 'global' },
    { resource: 'pickup', action: 'delete', scope: 'global' },
    { resource: 'lab_results', action: 'read', scope: 'global' },
    { resource: 'lab_results', action: 'create', scope: 'global' },
    { resource: 'lab_results', action: 'update', scope: 'global' },
    { resource: 'lab_results', action: 'delete', scope: 'global' },
    { resource: 'lab_results', action: 'execute', scope: 'global' },
    { resource: 'reports', action: 'read', scope: 'global' },
    { resource: 'reports', action: 'create', scope: 'global' },
    { resource: 'reports', action: 'execute', scope: 'global' },
    { resource: 'admin_ui', action: 'read', scope: 'global' },
    { resource: 'admin_ui', action: 'create', scope: 'global' },
    { resource: 'admin_ui', action: 'update', scope: 'global' },
    { resource: 'admin_ui', action: 'delete', scope: 'global' },
    { resource: 'admin_ui', action: 'execute', scope: 'global' },
    { resource: 'users', action: 'read', scope: 'global' },
    { resource: 'users', action: 'create', scope: 'global' },
    { resource: 'users', action: 'update', scope: 'global' },
    { resource: 'users', action: 'delete', scope: 'global' },
    { resource: 'roles', action: 'read', scope: 'global' },
    { resource: 'roles', action: 'create', scope: 'global' },
    { resource: 'roles', action: 'update', scope: 'global' },
    { resource: 'roles', action: 'delete', scope: 'global' },
    { resource: 'audit', action: 'read', scope: 'global' },
    { resource: 'customers', action: 'read', scope: 'global' },
    { resource: 'customers', action: 'create', scope: 'global' },
    { resource: 'customers', action: 'update', scope: 'global' },
    { resource: 'customers', action: 'delete', scope: 'global' },
    { resource: 'invoicing', action: 'read', scope: 'global' },
    { resource: 'invoicing', action: 'create', scope: 'global' },
    { resource: 'invoicing', action: 'update', scope: 'global' },
    { resource: 'analytics', action: 'read', scope: 'global' },
  ],
  CUSTOMER_VIEW: [
    { resource: 'reports', action: 'read', scope: 'ownReport' },
  ],
}

function permKey(perm: PermissionMatrixEntry): string {
  return `${perm.resource}:${perm.action}`
}

function hasPermissionInList(
  perm: PermissionMatrixEntry,
  list: PermissionMatrixEntry[],
  _context?: { ownerId?: string; customerId?: string }
): boolean {
  const found = list.find(
    (p) => p.resource === perm.resource && p.action === perm.action
  )
  if (!found) return false

  if (found.scope === 'global' || found.scope === 'organization') return true
  if (found.scope === 'owner') return true // Technician owns their pickups
  if (found.scope === 'ownReport') return true // Customer owns their reports
  return false
}

export function getPermissionsForRole(role: AuthRole): PermissionMatrixEntry[] {
  return ROLE_PERMISSION_MATRIX[role] ?? []
}

export function hasPermission(
  role: AuthRole,
  resource: Resource,
  action: Action,
  context?: { ownerId?: string; customerId?: string }
): boolean {
  const perms = getPermissionsForRole(role)
  return hasPermissionInList(
    { resource, action, scope: 'global' },
    perms,
    context
  )
}

export function getPageAccess(role: AuthRole): Record<string, boolean> {
  const perms = getPermissionsForRole(role)
  const keys = new Set(perms.map(permKey))

  return {
    dashboard: role !== 'CUSTOMER_VIEW',
    samples: keys.has('pickup:read') || keys.has('pickup:create'),
    pickups: keys.has('pickup:read') || keys.has('pickup:create'),
    lab: keys.has('lab_results:read') || keys.has('lab_results:create'),
    approvals: keys.has('lab_results:execute'),
    reports: keys.has('reports:read') || keys.has('reports:execute'),
    customers: keys.has('customers:read'),
    invoicing: keys.has('invoicing:read'),
    analytics: keys.has('analytics:read'),
    admin: keys.has('admin_ui:read'),
    adminUsers: keys.has('users:read'),
    adminRoles: keys.has('roles:read'),
    adminAudit: keys.has('audit:read'),
    portal: role === 'CUSTOMER_VIEW',
  }
}
