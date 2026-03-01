import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as labResultsApi from '@/api/lab-results'
import type { CreateLabResultInput } from '@/api/lab-results'

const QUERY_KEY = ['lab-results'] as const

export function useLabResults(pickupId?: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, pickupId ?? 'all'],
    queryFn: () => labResultsApi.fetchLabResults(pickupId ?? undefined),
  })
}

export function useLabResult(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ''],
    queryFn: () => (id ? labResultsApi.fetchLabResult(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

export function useCreateLabResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateLabResultInput) => labResultsApi.createLabResult(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdateLabResult() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: { spc?: number | null; total_coliform?: number | null; status?: 'pending' | 'approved' | 'rejected' }
    }) => labResultsApi.updateLabResult(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useApproveLabResult() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, pdfLink }: { id: string; pdfLink?: string | null }) =>
      labResultsApi.approveLabResult(id, user?.id ?? '', pdfLink),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
