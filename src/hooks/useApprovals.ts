/**
 * Lab Manager Approval & Audit - React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as approvalsApi from '@/api/approvals'
import type { PendingApprovalsFilters } from '@/api/approvals'
import type {
  ApproveRequestPayload,
  RejectRequestPayload,
  CorrectiveActionPayload,
  ReassignPayload,
  BatchActionPayload,
} from '@/types/approvals'

const QUERY_KEY = ['approvals'] as const

export function usePendingApprovals(filters?: PendingApprovalsFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'pending', filters ?? {}],
    queryFn: () => approvalsApi.fetchPendingApprovals(filters),
  })
}

export function useApproval(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ''],
    queryFn: () => (id ? approvalsApi.fetchApproval(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

export function useApproveApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveRequestPayload }) =>
      approvalsApi.approveApproval(id, payload, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useRejectApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectRequestPayload }) =>
      approvalsApi.rejectApproval(id, payload, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useRequestCorrectiveAction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CorrectiveActionPayload }) =>
      approvalsApi.requestCorrectiveAction(id, payload, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useReassignApproval() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReassignPayload }) =>
      approvalsApi.reassignApproval(id, payload, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useAddApprovalComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, message, role }: { id: string; message: string; role?: string }) =>
      approvalsApi.addApprovalComment(id, message, user?.id ?? '', role),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useBatchApprovalAction() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (payload: BatchActionPayload) =>
      approvalsApi.batchApprovalAction(payload, user?.id ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
