import type { ReactNode } from 'react'
import { useRBAC } from '@/hooks/useRBAC'
import type { Resource, PermissionAction } from '@/types/rbac'

interface PermissionGuardProps {
  children: ReactNode
  resource: Resource
  action: PermissionAction
  scope?: 'owner' | 'ownReport'
  /** When true, hide content; when false, show disabled state */
  hideWhenUnauthorized?: boolean
  /** Optional fallback when unauthorized */
  fallback?: ReactNode
}

/**
 * Renders children only when user has the required permission.
 * Use for permission-aware UI elements.
 */
export function PermissionGuard({
  children,
  resource,
  action,
  scope,
  hideWhenUnauthorized = true,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useRBAC()
  const allowed = hasPermission(resource, action, scope)

  if (allowed) {
    return <>{children}</>
  }

  if (hideWhenUnauthorized) {
    return <>{fallback}</>
  }

  return (
    <div className="pointer-events-none opacity-50" aria-disabled="true" title="You do not have permission for this action">
      {children}
    </div>
  )
}
