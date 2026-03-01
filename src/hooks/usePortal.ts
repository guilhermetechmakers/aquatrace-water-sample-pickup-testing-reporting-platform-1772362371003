/**
 * Customer Portal React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import {
  getCustomerIdForUser,
  fetchPortalReports,
  fetchPortalInvoices,
  createShareLink,
  fetchShareLinks,
  revokeShareLink,
  requestReissue,
  fetchPortalNotifications,
  markNotificationRead,
  fetchPortalAudit,
  createSupportTicket,
  createInvitation,
  fetchInvitations,
  logPortalAudit,
} from '@/api/portal'
import type { ShareLinkCreatePayload } from '@/types/portal'

export const portalKeys = {
  customer: (userId: string | null) => ['portal', 'customer', userId] as const,
  reports: (customerId: string | null, filters?: Record<string, unknown>) =>
    ['portal', 'reports', customerId, filters ?? {}] as const,
  invoices: (customerId: string | null, filters?: Record<string, unknown>) =>
    ['portal', 'invoices', customerId, filters ?? {}] as const,
  shareLinks: (customerId: string | null, targetType?: string) =>
    ['portal', 'shareLinks', customerId, targetType] as const,
  notifications: (customerId: string | null, userId?: string | null) =>
    ['portal', 'notifications', customerId, userId] as const,
  audit: (customerId: string | null, since?: string) =>
    ['portal', 'audit', customerId, since] as const,
  invitations: (customerId: string | null) =>
    ['portal', 'invitations', customerId] as const,
}

/** Get customer/tenant ID for current user */
export function useTenantData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: portalKeys.customer(user?.id ?? null),
    queryFn: () => getCustomerIdForUser(user?.id ?? null),
    enabled: Boolean(user?.id),
  })
}

/** Portal reports with filters */
export function usePortalReports(filters?: {
  dateFrom?: string
  dateTo?: string
  status?: string
  search?: string
  testType?: string
  page?: number
  limit?: number
}) {
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.reports(customerId ?? null, filters),
    queryFn: () => fetchPortalReports(customerId ?? null, filters),
    enabled: Boolean(customerId),
  })
}

/** Portal invoices */
export function usePortalInvoices(filters?: Record<string, unknown>) {
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.invoices(customerId ?? null, filters),
    queryFn: () => fetchPortalInvoices(customerId ?? null, filters),
    enabled: Boolean(customerId),
  })
}

/** Share links */
export function useShareLinks(targetType?: 'report' | 'invoice') {
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.shareLinks(customerId ?? null, targetType),
    queryFn: () => fetchShareLinks(customerId ?? null, targetType),
    enabled: Boolean(customerId),
  })
}

/** Create share link mutation */
export function useCreateShareLink() {
  const queryClient = useQueryClient()
  const { data: customerId } = useTenantData()
  return useMutation({
    mutationFn: (payload: ShareLinkCreatePayload) =>
      createShareLink(customerId ?? null, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'shareLinks'] })
    },
  })
}

/** Revoke share link mutation */
export function useRevokeShareLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => revokeShareLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'shareLinks'] })
    },
  })
}

/** Request reissue mutation */
export function useRequestReissue() {
  const queryClient = useQueryClient()
  const { data: customerId } = useTenantData()
  return useMutation({
    mutationFn: ({ reportId, reason }: { reportId: string; reason?: string }) =>
      requestReissue(customerId ?? null, reportId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'reports'] })
    },
  })
}

/** Notifications */
export function useNotifications() {
  const { user } = useAuth()
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.notifications(customerId ?? null, user?.id ?? null),
    queryFn: () => fetchPortalNotifications(customerId ?? null, user?.id ?? null),
    enabled: Boolean(customerId),
  })
}

/** Mark notification read mutation */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'notifications'] })
    },
  })
}

/** Portal audit log */
export function useAudits(since?: string) {
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.audit(customerId ?? null, since),
    queryFn: () => fetchPortalAudit(customerId ?? null, since),
    enabled: Boolean(customerId),
  })
}

/** Create support ticket mutation */
export function useCreateSupportTicket() {
  const { data: customerId } = useTenantData()
  return useMutation({
    mutationFn: ({
      subject,
      description,
      reportId,
    }: {
      subject: string
      description?: string
      reportId?: string | null
    }) => createSupportTicket(customerId ?? null, subject, description, reportId),
  })
}

/** Invitations for tenant */
export function useInvitations() {
  const { data: customerId } = useTenantData()
  return useQuery({
    queryKey: portalKeys.invitations(customerId ?? null),
    queryFn: () => fetchInvitations(customerId ?? null),
    enabled: Boolean(customerId),
  })
}

/** Create invitation mutation */
export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      customerId,
      email,
      role,
    }: {
      customerId: string | null
      email: string
      role?: 'CUSTOMER_VIEW' | 'ADMIN'
    }) => createInvitation(customerId, email, role ?? 'CUSTOMER_VIEW'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'invitations'] })
    },
  })
}

/** Log audit event (mutation for fire-and-forget) */
export function useLogPortalAudit() {
  const { data: customerId } = useTenantData()
  return useMutation({
    mutationFn: ({
      action,
      itemType,
      itemId,
      metadata,
    }: {
      action: string
      itemType: string
      itemId?: string | null
      metadata?: Record<string, unknown>
    }) => logPortalAudit(customerId ?? null, action, itemType, itemId, metadata),
  })
}
