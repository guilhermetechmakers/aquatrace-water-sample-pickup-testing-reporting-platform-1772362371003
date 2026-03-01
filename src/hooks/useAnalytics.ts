/**
 * Analytics & Reporting React Query hooks
 * KPIs, trends, SLA alerts, exports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchKPIs,
  fetchTrends,
  fetchSLAAlerts,
  fetchErrorRates,
  fetchExports,
  fetchSLAComplianceByCustomer,
  requestExport,
  scheduleExport,
  acknowledgeSLAAlert,
  resolveSLAAlert,
} from '@/api/analytics'
import type { AnalyticsFilters } from '@/types/analytics'

export const analyticsKeys = {
  all: ['analytics'] as const,
  kpis: (filters?: AnalyticsFilters) => ['analytics', 'kpis', filters] as const,
  trends: (metric: string, filters?: AnalyticsFilters, granularity?: string) =>
    ['analytics', 'trends', metric, filters, granularity] as const,
  alerts: (status?: string) => ['analytics', 'alerts', status] as const,
  errorRates: (filters?: AnalyticsFilters) => ['analytics', 'errorRates', filters] as const,
  exports: () => ['analytics', 'exports'] as const,
  slaCompliance: (filters?: AnalyticsFilters) =>
    ['analytics', 'slaCompliance', filters] as const,
}

export function useKPIs(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.kpis(filters),
    queryFn: () => fetchKPIs(filters),
  })
}

export function useTrends(
  metric: string,
  filters?: AnalyticsFilters,
  granularity: 'day' | 'week' | 'month' = 'week'
) {
  return useQuery({
    queryKey: analyticsKeys.trends(metric, filters, granularity),
    queryFn: () => fetchTrends(metric, filters, granularity),
  })
}

export function useSLAAlerts(status?: 'open' | 'acknowledged' | 'resolved' | '') {
  return useQuery({
    queryKey: analyticsKeys.alerts(status),
    queryFn: () => fetchSLAAlerts(status, 100),
  })
}

export function useErrorRates(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.errorRates(filters),
    queryFn: () => fetchErrorRates(filters),
  })
}

export function useExports() {
  return useQuery({
    queryKey: analyticsKeys.exports(),
    queryFn: () => fetchExports(50),
  })
}

export function useRequestExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, filters }: { type: 'pdf' | 'csv'; filters?: AnalyticsFilters }) =>
      requestExport(type, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.exports() })
    },
  })
}

export function useAcknowledgeSLAAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      acknowledgeSLAAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.alerts() })
    },
  })
}

export function useResolveSLAAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      resolveSLAAlert(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.alerts() })
    },
  })
}

export function useSLAComplianceByCustomer(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.slaCompliance(filters),
    queryFn: () => fetchSLAComplianceByCustomer(filters),
  })
}

export function useScheduleExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      type: 'pdf' | 'csv'
      schedule: 'daily' | 'weekly' | 'monthly'
      filters?: AnalyticsFilters
    }) => scheduleExport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.exports() })
    },
  })
}
