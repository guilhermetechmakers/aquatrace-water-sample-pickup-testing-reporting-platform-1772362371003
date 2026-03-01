/**
 * React Query hooks for Sites (sample pickup locations)
 */

import { useQuery } from '@tanstack/react-query'
import { fetchSites } from '@/api/sites'

const QUERY_KEY = ['sites'] as const

export function useSites() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSites,
  })
}
