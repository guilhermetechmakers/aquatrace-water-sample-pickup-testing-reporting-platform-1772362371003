import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import * as reportsApi from '@/api/reports'

const QUERY_KEY = ['reports'] as const

export function useReports() {
  const { user } = useAuth()
  const { getVisibleData } = useRBAC()
  const { scope } = getVisibleData('reports')

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? '', scope],
    queryFn: () =>
      scope === 'ownReport' && user?.id
        ? reportsApi.fetchReportsForCustomerUser(user.id)
        : reportsApi.fetchAllReports(),
    enabled: Boolean(user),
  })
}
