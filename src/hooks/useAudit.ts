/**
 * Audit Trail & Compliance - React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import * as auditApi from '@/api/audit'
import type { CreateAuditLogPayload, AuditLogFilters } from '@/types/audit'

const QUERY_KEY = ['audit'] as const

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'logs', filters],
    queryFn: () => auditApi.fetchAuditLogs(filters),
  })
}

export function useAuditSummary(filters?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'summary', filters ?? {}],
    queryFn: () => auditApi.fetchAuditSummary(filters),
  })
}

export function useCreateAuditLog() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: Omit<CreateAuditLogPayload, 'userId' | 'userName'>) => {
      await auditApi.createAuditLog({
        ...payload,
        userId: user?.id ?? '',
        userName: user?.displayName ?? user?.email ?? undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: {
      from?: string
      to?: string
      userId?: string
      actionTypes?: string[]
      resourceTypes?: string[]
      q?: string
      format: 'csv' | 'json'
    }) => {
      const blob = await auditApi.exportAuditLogs({
        from: params.from,
        to: params.to,
        userId: params.userId,
        actionTypes: params.actionTypes,
        resourceTypes: params.resourceTypes,
        format: params.format,
      })
      const content = await blob.text()
      const filename = `audit-export-${new Date().toISOString().slice(0, 10)}.${params.format}`
      return { content, filename }
    },
  })
}
