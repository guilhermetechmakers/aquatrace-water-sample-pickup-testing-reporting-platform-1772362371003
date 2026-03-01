import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { hasPermission, canAccessPage } from '@/lib/rbac'
import type { AuthRole } from '@/types/auth'
import type { Resource, PermissionAction } from '@/types/rbac'

export interface UseRBACReturn {
  /** Current user from auth context */
  currentUser: ReturnType<typeof useAuth>['user']
  /** Check if user has permission for resource:action */
  hasPermission: (resource: Resource, action: PermissionAction, scope?: 'owner' | 'ownReport') => boolean
  /** Check if user can access a page by path */
  canAccessPage: (page: string) => boolean
  /** Get visible data schema based on role (for attribute-based filtering) */
  getVisibleData: (schema: 'pickups' | 'lab_results' | 'reports' | 'users' | 'audit') => { scope: 'owner' | 'ownReport' | 'global' }
  /** User's role */
  role: AuthRole | null
  /** Whether user is admin */
  isAdmin: boolean
  /** Whether user is technician */
  isTechnician: boolean
  /** Whether user is lab tech or manager */
  isLabStaff: boolean
  /** Whether user is customer viewer */
  isCustomerViewer: boolean
}

export function useRBAC(): UseRBACReturn {
  const { user } = useAuth()

  return useMemo(() => {
    const role = (user?.role ?? null) as AuthRole | null

    const hp = (resource: Resource, action: PermissionAction, scope?: 'owner' | 'ownReport') => {
      if (!role) return false
      return hasPermission(role, resource, action, scope)
    }

    const cap = (page: string) => {
      if (!role) return false
      return canAccessPage(role, page)
    }

    const getVisibleData = (schema: 'pickups' | 'lab_results' | 'reports' | 'users' | 'audit') => {
      if (!role) return { scope: 'global' as const }
      if (role === 'TECHNICIAN' && schema === 'pickups') return { scope: 'owner' as const }
      if (role === 'CUSTOMER_VIEW' && schema === 'reports') return { scope: 'ownReport' as const }
      return { scope: 'global' as const }
    }

    return {
      currentUser: user,
      hasPermission: hp,
      canAccessPage: cap,
      getVisibleData,
      role,
      isAdmin: role === 'ADMIN',
      isTechnician: role === 'TECHNICIAN',
      isLabStaff: role === 'LAB_TECH' || role === 'LAB_MANAGER',
      isCustomerViewer: role === 'CUSTOMER_VIEW',
    }
  }, [user])
}
