import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { user, isLoading, isInitialized } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" aria-live="polite">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
