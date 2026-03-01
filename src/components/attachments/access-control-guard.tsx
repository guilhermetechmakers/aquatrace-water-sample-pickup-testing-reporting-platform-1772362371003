/**
 * AccessControlGuard - Show children only when user has permission
 */

import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { hasPermission } from '@/lib/rbac'
import type { Resource, PermissionAction } from '@/types/rbac'

export interface AccessControlGuardProps {
  resource: Resource
  action: PermissionAction
  children: ReactNode
  fallback?: ReactNode
}

export function AccessControlGuard({
  resource,
  action,
  children,
  fallback = null,
}: AccessControlGuardProps) {
  const { user } = useAuth()

  if (!user) return <>{fallback}</>

  const allowed = hasPermission(user.role, resource, action)
  return <>{allowed ? children : fallback}</>
}
