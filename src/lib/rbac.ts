import type { AuthRole } from '@/types/auth'
import type { Resource, PermissionAction } from '@/types/rbac'

/** Default permission matrix: role -> resource -> actions */
const ROLE_PERMISSIONS: Record<AuthRole, Record<Resource, PermissionAction[]>> = {
  TECHNICIAN: {
    pickup: ['read', 'create', 'update'],
    lab_results: [],
    lab_queue: [],
    reports: [],
    approvals: [],
    admin_ui: [],
    roles: [],
    users: [],
    audit: [],
    technician_dashboard: ['read'],
    customer_portal: [],
    customers: [],
    invoicing: [],
    analytics: [],
  },
  LAB_TECH: {
    pickup: ['read'],
    lab_results: ['read', 'create', 'update'],
    lab_queue: ['read'],
    reports: [],
    approvals: [],
    admin_ui: [],
    roles: [],
    users: [],
    audit: [],
    technician_dashboard: [],
    customer_portal: [],
    customers: [],
    invoicing: [],
    analytics: [],
  },
  LAB_MANAGER: {
    pickup: ['read'],
    lab_results: ['read', 'update', 'execute'],
    lab_queue: ['read'],
    reports: ['read', 'execute'],
    approvals: ['read', 'execute'],
    admin_ui: [],
    roles: [],
    users: [],
    audit: [],
    technician_dashboard: [],
    customer_portal: [],
    customers: ['read'],
    invoicing: ['read'],
    analytics: ['read'],
  },
  ADMIN: {
    pickup: ['read', 'create', 'update', 'delete'],
    lab_results: ['read', 'create', 'update', 'delete', 'execute'],
    lab_queue: ['read'],
    reports: ['read', 'create', 'update', 'delete', 'execute'],
    approvals: ['read', 'execute'],
    admin_ui: ['read', 'create', 'update', 'delete', 'execute'],
    roles: ['read', 'create', 'update', 'delete'],
    users: ['read', 'update'],
    audit: ['read'],
    technician_dashboard: ['read'],
    customer_portal: [],
    customers: ['read', 'create', 'update', 'delete'],
    invoicing: ['read', 'create', 'update'],
    analytics: ['read'],
  },
  CUSTOMER_VIEW: {
    pickup: [],
    lab_results: [],
    lab_queue: [],
    reports: ['read'],
    approvals: [],
    admin_ui: [],
    roles: [],
    users: [],
    audit: [],
    technician_dashboard: [],
    customer_portal: ['read'],
    customers: [],
    invoicing: [],
    analytics: [],
  },
}

export function hasPermission(
  role: AuthRole,
  resource: Resource,
  action: PermissionAction,
  _scope?: 'owner' | 'ownReport'
): boolean {
  const actions = ROLE_PERMISSIONS[role]?.[resource] ?? []
  return actions.includes(action)
}

export function canAccessPage(role: AuthRole, page: string): boolean {
  const pageAccess: Record<string, AuthRole[]> = {
    '/dashboard': ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/dashboard/samples': ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/dashboard/lab': ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/dashboard/approvals': ['LAB_MANAGER', 'ADMIN'],
    '/dashboard/reports': ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/dashboard/customers': ['LAB_MANAGER', 'ADMIN'],
    '/dashboard/invoicing': ['LAB_MANAGER', 'ADMIN'],
    '/dashboard/analytics': ['LAB_MANAGER', 'ADMIN'],
    '/dashboard/profile': ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/dashboard/admin': ['ADMIN'],
    '/dashboard/users': ['ADMIN'],
    '/dashboard/audit': ['ADMIN'],
    '/dashboard/pickups': ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'],
    '/portal': ['CUSTOMER_VIEW'],
  }
  const allowed = pageAccess[page] ?? []
  return allowed.includes(role)
}
