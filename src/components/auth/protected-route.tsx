import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import type { AuthRole } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: AuthRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles != null && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    const isCustomerView = user.role === 'CUSTOMER_VIEW'
    return <Navigate to={isCustomerView ? '/portal' : '/dashboard'} replace />
  }

  return <>{children}</>
}
