/**
 * Billing & Invoicing React Query hooks
 * useBillingCustomers, useInvoices, useInvoice, useARAging, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchBillingCustomers,
  fetchBillingCustomer,
  createBillingCustomer,
  updateBillingCustomer,
  fetchInvoices,
  fetchInvoice,
  createInvoice,
  updateInvoiceStatus,
  recordPayment,
  sendInvoice,
  fetchSubscriptions,
  createSubscription,
  fetchARAgingSummary,
  fetchARAccounts,
  fetchBillingSettings,
  saveBillingSettings,
  triggerARReminders,
  generateInvoicePdf,
  createStripeCustomer,
} from '@/api/billing'
import type {
  CustomerCreatePayload,
  InvoiceCreatePayload,
  PaymentRecordPayload,
  SubscriptionCreatePayload,
} from '@/types/billing'

const BILLING_KEYS = {
  customers: ['billing', 'customers'] as const,
  customer: (id: string) => ['billing', 'customer', id] as const,
  invoices: (filters?: Record<string, unknown>) => ['billing', 'invoices', filters ?? {}] as const,
  invoice: (id: string) => ['billing', 'invoice', id] as const,
  subscriptions: (customerId?: string) => ['billing', 'subscriptions', customerId ?? ''] as const,
  arAging: ['billing', 'ar-aging'] as const,
  arAccounts: ['billing', 'ar-accounts'] as const,
  settings: ['billing', 'settings'] as const,
}

/** List customers with billing details */
export function useBillingCustomers(filters?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...BILLING_KEYS.customers, filters ?? {}],
    queryFn: () => fetchBillingCustomers(filters),
  })
}

/** Single customer */
export function useBillingCustomer(id: string | null) {
  return useQuery({
    queryKey: BILLING_KEYS.customer(id ?? ''),
    queryFn: () => (id ? fetchBillingCustomer(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

/** Create customer mutation */
export function useCreateBillingCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CustomerCreatePayload) => createBillingCustomer(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customers })
      toast.success('Customer created')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to create customer'),
  })
}

/** Update customer mutation */
export function useUpdateBillingCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerCreatePayload> }) =>
      updateBillingCustomer(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customers })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customer(id) })
      toast.success('Customer updated')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to update customer'),
  })
}

/** List invoices */
export function useInvoices(filters?: {
  customerId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: BILLING_KEYS.invoices(filters ?? {}),
    queryFn: () => fetchInvoices(filters),
  })
}

/** Single invoice with items and payments */
export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: BILLING_KEYS.invoice(id ?? ''),
    queryFn: () => (id ? fetchInvoice(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

/** Create invoice mutation */
export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvoiceCreatePayload) => createInvoice(payload),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices({}) })
      if (inv?.id) qc.invalidateQueries({ queryKey: BILLING_KEYS.invoice(inv.id) })
      toast.success('Invoice created')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to create invoice'),
  })
}

/** Update invoice status mutation */
export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'issued' | 'paid' | 'overdue' | 'refunded' | 'partially_paid' }) =>
      updateInvoiceStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices({}) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoice(id) })
      toast.success('Invoice updated')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to update invoice'),
  })
}

/** Record payment mutation */
export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PaymentRecordPayload) => recordPayment(payload),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices({}) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoice(invoiceId) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.arAging })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.arAccounts })
      toast.success('Payment recorded')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to record payment'),
  })
}

/** List subscriptions */
export function useSubscriptions(customerId?: string | null) {
  return useQuery({
    queryKey: BILLING_KEYS.subscriptions(customerId ?? undefined),
    queryFn: () => fetchSubscriptions(customerId ?? undefined),
  })
}

/** Create subscription mutation */
export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SubscriptionCreatePayload) => createSubscription(payload),
    onSuccess: (_, { customerId }) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.subscriptions(customerId) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customer(customerId) })
      toast.success('Subscription created')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to create subscription'),
  })
}

/** AR aging summary */
export function useARAgingSummary() {
  return useQuery({
    queryKey: BILLING_KEYS.arAging,
    queryFn: fetchARAgingSummary,
  })
}

/** AR accounts list */
export function useARAccounts() {
  return useQuery({
    queryKey: BILLING_KEYS.arAccounts,
    queryFn: fetchARAccounts,
  })
}

/** Send invoice mutation */
export function useSendInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sendInvoice(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoices({}) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.invoice(id) })
      toast.success('Invoice sent')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to send invoice'),
  })
}

/** Billing settings */
export function useBillingSettings() {
  return useQuery({
    queryKey: BILLING_KEYS.settings,
    queryFn: fetchBillingSettings,
  })
}

/** Save billing settings mutation */
export function useSaveBillingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (settings: { currency?: string; defaultTaxRate?: number; remindersCadence?: string }) =>
      saveBillingSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.settings })
      toast.success('Settings saved')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to save settings'),
  })
}

/** Trigger AR reminders mutation */
export function useTriggerARReminders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => triggerARReminders(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.arAging })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.arAccounts })
      toast.success(`Reminders queued for ${data?.sent ?? 0} overdue invoice(s)`)
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to trigger reminders'),
  })
}

/** Generate invoice PDF mutation */
export function useGenerateInvoicePdf() {
  return useMutation({
    mutationFn: (invoiceId: string) => generateInvoicePdf(invoiceId),
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to generate PDF'),
  })
}

/** Create Stripe customer mutation */
export function useCreateStripeCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (customerId: string) => createStripeCustomer(customerId),
    onSuccess: (_, customerId) => {
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customer(customerId) })
      qc.invalidateQueries({ queryKey: BILLING_KEYS.customers })
      toast.success('Stripe customer created')
    },
    onError: (err: Error) => toast.error(err?.message ?? 'Failed to create Stripe customer'),
  })
}
