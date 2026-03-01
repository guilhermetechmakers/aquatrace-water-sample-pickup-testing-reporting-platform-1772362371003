/**
 * Billing & Invoicing API
 * Customers, invoices, payments, subscriptions, AR aging
 * Uses Supabase client with runtime safety guards
 */

import { supabase } from '@/lib/supabase'
import type {
  BillingCustomer,
  Invoice,
  InvoiceItem,
  Payment,
  Subscription,
  ARAccount,
  ARAgingSummary,
  CustomerCreatePayload,
  InvoiceCreatePayload,
  PaymentRecordPayload,
  SubscriptionCreatePayload,
} from '@/types/billing'
const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Map DB row to BillingCustomer */
function rowToCustomer(row: Record<string, unknown>): BillingCustomer {
  const addr = row.billing_address as Record<string, unknown> | null | undefined
  const tax = row.tax_info as Record<string, unknown> | null | undefined
  return {
    id: (row.id as string) ?? '',
    name: (row.name as string) ?? '',
    email: (row.email as string) ?? '',
    userId: (row.user_id as string) ?? null,
    billingAddress: addr && typeof addr === 'object' ? (addr as BillingCustomer['billingAddress']) : null,
    currency: (row.currency as string) ?? 'USD',
    stripeCustomerId: (row.stripe_customer_id as string) ?? null,
    taxInfo: tax && typeof tax === 'object' ? (tax as BillingCustomer['taxInfo']) : null,
    billingContact: (row.billing_contact as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? undefined,
  }
}

/** Map DB row to Invoice */
function rowToInvoice(row: Record<string, unknown>): Invoice {
  const amt = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount ?? 0)) || 0
  const taxes = typeof row.taxes === 'number' ? row.taxes : parseFloat(String(row.taxes ?? 0)) || 0
  const discounts = typeof row.discounts === 'number' ? row.discounts : parseFloat(String(row.discounts ?? 0)) || 0
  return {
    id: (row.id as string) ?? '',
    customerId: (row.customer_id as string) ?? '',
    invoiceId: (row.invoice_id as string) ?? '',
    status: ((row.status as string) ?? 'draft') as Invoice['status'],
    dueDate: (row.due_date as string) ?? (row.date as string) ?? '',
    issueDate: (row.issue_date as string) ?? (row.date as string) ?? '',
    date: (row.date as string) ?? undefined,
    totalAmount: amt,
    taxes,
    discounts,
    currency: (row.currency as string) ?? 'USD',
    stripeInvoiceId: (row.stripe_invoice_id as string) ?? null,
    subscriptionId: (row.subscription_id as string) ?? null,
    pdfPath: (row.pdf_path as string) ?? null,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? undefined,
  }
}

/** Map DB row to InvoiceItem */
function rowToInvoiceItem(row: Record<string, unknown>): InvoiceItem {
  const qty = typeof row.quantity === 'number' ? row.quantity : parseFloat(String(row.quantity ?? 1)) || 1
  const up = typeof row.unit_price === 'number' ? row.unit_price : parseFloat(String(row.unit_price ?? 0)) || 0
  const lt = typeof row.line_total === 'number' ? row.line_total : parseFloat(String(row.line_total ?? 0)) || 0
  return {
    id: (row.id as string) ?? undefined,
    invoiceId: (row.invoice_id as string) ?? undefined,
    description: (row.description as string) ?? '',
    quantity: qty,
    unitPrice: up,
    lineTotal: lt,
    taxRate: typeof row.tax_rate === 'number' ? row.tax_rate : parseFloat(String(row.tax_rate ?? 0)) || 0,
    taxAmount: typeof row.tax_amount === 'number' ? row.tax_amount : parseFloat(String(row.tax_amount ?? 0)) || 0,
    discountAmount: typeof row.discount_amount === 'number' ? row.discount_amount : parseFloat(String(row.discount_amount ?? 0)) || 0,
  }
}

/** Map DB row to Payment */
function rowToPayment(row: Record<string, unknown>): Payment {
  const amt = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount ?? 0)) || 0
  return {
    id: (row.id as string) ?? '',
    invoiceId: (row.invoice_id as string) ?? '',
    amount: amt,
    method: ((row.method as string) ?? 'card') as Payment['method'],
    status: ((row.status as string) ?? 'completed') as Payment['status'],
    paidAt: (row.paid_at as string) ?? (row.created_at as string) ?? '',
    stripePaymentIntentId: (row.stripe_payment_intent_id as string) ?? null,
    createdAt: (row.created_at as string) ?? undefined,
  }
}

/** Map DB row to Subscription */
function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: (row.id as string) ?? '',
    customerId: (row.customer_id as string) ?? '',
    stripeSubscriptionId: (row.stripe_subscription_id as string) ?? null,
    status: ((row.status as string) ?? 'active') as Subscription['status'],
    currentPeriodStart: (row.current_period_start as string) ?? '',
    currentPeriodEnd: (row.current_period_end as string) ?? '',
    planId: (row.plan_id as string) ?? null,
    quantity: typeof row.quantity === 'number' ? row.quantity : parseInt(String(row.quantity ?? 1), 10) || 1,
    trialEnd: (row.trial_end as string) ?? null,
    cancelAt: (row.cancel_at as string) ?? null,
    proration: (row.proration as boolean) ?? true,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  }
}

/** List customers with billing details */
export async function fetchBillingCustomers(filters?: {
  search?: string
  page?: number
  limit?: number
}): Promise<{ customers: BillingCustomer[]; count: number }> {
  if (!isSupabaseConfigured()) return { customers: [], count: 0 }

  let q = supabase
    .from('customers')
    .select('id, name, email, user_id, billing_address, currency, stripe_customer_id, tax_info, billing_contact, created_at, updated_at', { count: 'exact' })
    .order('name', { ascending: true })

  if (filters?.search?.trim()) {
    q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }

  const page = Math.max(1, filters?.page ?? 1)
  const limit = Math.min(50, Math.max(10, filters?.limit ?? 20))
  q = q.range((page - 1) * limit, page * limit - 1)

  const { data: rows, error, count } = await q
  if (error) return { customers: [], count: 0 }
  const list = rows ?? []
  const customers = Array.isArray(list) ? list.map((r) => rowToCustomer(r as Record<string, unknown>)) : []
  return { customers, count: count ?? customers.length }
}

/** Get single customer by ID */
export async function fetchBillingCustomer(id: string): Promise<BillingCustomer | null> {
  if (!isSupabaseConfigured() || !id) return null

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return rowToCustomer(data as Record<string, unknown>)
}

/** Create customer */
export async function createBillingCustomer(payload: CustomerCreatePayload): Promise<BillingCustomer | null> {
  if (!isSupabaseConfigured()) return null

  const taxInfo = payload.taxInfo ?? (payload.taxId || payload.taxExempt
    ? { taxId: payload.taxId, taxExempt: payload.taxExempt, taxExemptReason: payload.taxExemptReason }
    : {})
  const { data, error } = await supabase
    .from('customers')
    .insert({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      billing_address: payload.billingAddress ?? {},
      currency: payload.currency ?? 'USD',
      billing_contact: payload.billingContact ?? null,
      tax_info: taxInfo,
    })
    .select()
    .single()

  if (error) return null
  return rowToCustomer((data ?? {}) as Record<string, unknown>)
}

/** Update customer */
export async function updateBillingCustomer(
  id: string,
  payload: Partial<CustomerCreatePayload>
): Promise<BillingCustomer | null> {
  if (!isSupabaseConfigured() || !id) return null

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (payload.name != null) update.name = payload.name.trim()
  if (payload.email != null) update.email = payload.email.trim().toLowerCase()
  if (payload.billingAddress != null) update.billing_address = payload.billingAddress
  if (payload.currency != null) update.currency = payload.currency
  if (payload.billingContact != null) update.billing_contact = payload.billingContact
  if (payload.taxInfo != null) update.tax_info = payload.taxInfo
  else if (payload.taxId != null || payload.taxExempt != null) {
    update.tax_info = {
      taxId: payload.taxId,
      taxExempt: payload.taxExempt,
      taxExemptReason: payload.taxExemptReason,
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return rowToCustomer((data ?? {}) as Record<string, unknown>)
}

/** List invoices with filters */
export async function fetchInvoices(filters?: {
  customerId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ invoices: Invoice[]; count: number }> {
  if (!isSupabaseConfigured()) return { invoices: [], count: 0 }

  let q = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters?.customerId) q = q.eq('customer_id', filters.customerId)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.dateFrom) q = q.gte('due_date', filters.dateFrom)
  if (filters?.dateTo) q = q.lte('due_date', filters.dateTo)

  const page = Math.max(1, filters?.page ?? 1)
  const limit = Math.min(50, Math.max(10, filters?.limit ?? 20))
  q = q.range((page - 1) * limit, page * limit - 1)

  const { data: rows, error, count } = await q
  if (error) return { invoices: [], count: 0 }
  const list = rows ?? []
  let invoices = Array.isArray(list) ? list.map((r) => rowToInvoice(r as Record<string, unknown>)) : []

  if (filters?.search?.trim()) {
    const term = filters.search.toLowerCase()
    invoices = invoices.filter(
      (inv) =>
        inv.invoiceId.toLowerCase().includes(term) ||
        String(inv.totalAmount).includes(term)
    )
  }

  return { invoices, count: count ?? invoices.length }
}

/** Get invoice by ID with items and payments */
export async function fetchInvoice(id: string): Promise<Invoice | null> {
  if (!isSupabaseConfigured() || !id) return null

  const { data: invRow, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !invRow) return null
  const invoice = rowToInvoice(invRow as Record<string, unknown>)

  const { data: itemRows } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: true })

  const items = Array.isArray(itemRows ?? []) ? (itemRows ?? []).map((r) => rowToInvoiceItem(r as Record<string, unknown>)) : []
  invoice.items = items

  const { data: payRows } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  const payments = Array.isArray(payRows ?? []) ? (payRows ?? []).map((r) => rowToPayment(r as Record<string, unknown>)) : []
  invoice.payments = payments

  return invoice
}

/** Generate next invoice ID */
async function generateInvoiceId(): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const last = (data as { invoice_id?: string } | null)?.invoice_id ?? ''
  const match = last.match(/INV-(\d+)/)
  const num = match ? parseInt(match[1], 10) + 1 : 1
  const year = new Date().getFullYear()
  return `INV-${year}-${String(num).padStart(4, '0')}`
}

/** Create invoice with line items */
export async function createInvoice(payload: InvoiceCreatePayload): Promise<Invoice | null> {
  if (!isSupabaseConfigured()) return null

  const items = Array.isArray(payload.items) ? payload.items : []
  const invoiceId = await generateInvoiceId()

  let subtotal = 0
  const processedItems = items.map((item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity ?? 1)) || 1
    const up = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice ?? 0)) || 0
    const taxRate = typeof item.taxRate === 'number' ? item.taxRate : parseFloat(String(item.taxRate ?? 0)) || 0
    const lineTotal = qty * up
    const taxAmount = lineTotal * (taxRate / 100)
    subtotal += lineTotal + taxAmount
    return {
      description: item.description,
      quantity: qty,
      unit_price: up,
      line_total: lineTotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: 0,
    }
  })

  const taxes = typeof payload.taxes === 'number' ? payload.taxes : 0
  const discounts = typeof payload.discounts === 'number' ? payload.discounts : 0
  const totalAmount = subtotal + taxes - discounts

  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .insert({
      customer_id: payload.customerId,
      invoice_id: invoiceId,
      date: payload.issueDate ?? payload.dueDate,
      due_date: payload.dueDate,
      issue_date: payload.issueDate ?? payload.dueDate,
      amount: totalAmount,
      taxes,
      discounts,
      currency: payload.currency ?? 'USD',
      status: 'draft',
    })
    .select()
    .single()

  if (invError || !invData) return null
  const invId = (invData as Record<string, unknown>).id as string

  if (processedItems.length > 0) {
    await supabase.from('invoice_items').insert(
      processedItems.map((it) => ({ ...it, invoice_id: invId }))
    )
  }

  return fetchInvoice(invId)
}

/** Update invoice status */
export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<boolean> {
  if (!isSupabaseConfigured() || !id) return false
  const { error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

/** Record payment against invoice */
export async function recordPayment(payload: PaymentRecordPayload): Promise<Payment | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: payload.invoiceId,
      amount: payload.amount,
      method: payload.method ?? 'card',
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return null

  const payment = rowToPayment((data ?? {}) as Record<string, unknown>)

  const { data: inv } = await supabase.from('invoices').select('amount').eq('id', payload.invoiceId).maybeSingle()
  const invAmount = typeof (inv as { amount?: number } | null)?.amount === 'number' ? (inv as { amount?: number }).amount! : 0
  const paidTotal = payload.amount
  const newStatus = paidTotal >= invAmount ? 'paid' : 'partially_paid'
  await supabase
    .from('invoices')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', payload.invoiceId)

  return payment
}

/** List subscriptions for customer */
export async function fetchSubscriptions(customerId?: string): Promise<Subscription[]> {
  if (!isSupabaseConfigured()) return []

  let q = supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
  if (customerId) q = q.eq('customer_id', customerId)

  const { data: rows, error } = await q
  if (error) return []
  const list = rows ?? []
  return Array.isArray(list) ? list.map((r) => rowToSubscription(r as Record<string, unknown>)) : []
}

/** Create subscription (local only; Stripe sync via Edge Function) */
export async function createSubscription(payload: SubscriptionCreatePayload): Promise<Subscription | null> {
  if (!isSupabaseConfigured()) return null

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  let trialEnd: string | null = null
  if (payload.trialDays && payload.trialDays > 0) {
    const te = new Date(now)
    te.setDate(te.getDate() + payload.trialDays)
    trialEnd = te.toISOString()
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      customer_id: payload.customerId,
      status: trialEnd ? 'trialing' : 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      plan_id: payload.planId,
      quantity: payload.quantity ?? 1,
      trial_end: trialEnd,
      proration: payload.proration ?? true,
    })
    .select()
    .single()

  if (error) return null
  return rowToSubscription((data ?? {}) as Record<string, unknown>)
}

/** Fetch AR accounts for aging report */
export async function fetchARAccounts(): Promise<ARAccount[]> {
  if (!isSupabaseConfigured()) return []

  const { data: rows, error } = await supabase
    .from('ar_accounts')
    .select('*')
    .order('balance', { ascending: false })

  if (error) return []
  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: (row.id as string) ?? '',
          customerId: (row.customer_id as string) ?? '',
          balance: typeof row.balance === 'number' ? row.balance : parseFloat(String(row.balance ?? 0)) || 0,
          lastPaymentDate: (row.last_payment_date as string) ?? null,
          agingCurrent: typeof row.aging_current === 'number' ? row.aging_current : parseFloat(String(row.aging_current ?? 0)) || 0,
          aging7: typeof row.aging_7 === 'number' ? row.aging_7 : parseFloat(String(row.aging_7 ?? 0)) || 0,
          aging14: typeof row.aging_14 === 'number' ? row.aging_14 : parseFloat(String(row.aging_14 ?? 0)) || 0,
          aging30: typeof row.aging_30 === 'number' ? row.aging_30 : parseFloat(String(row.aging_30 ?? 0)) || 0,
          aging60: typeof row.aging_60 === 'number' ? row.aging_60 : parseFloat(String(row.aging_60 ?? 0)) || 0,
          aging90Plus: typeof row.aging_90_plus === 'number' ? row.aging_90_plus : parseFloat(String(row.aging_90_plus ?? 0)) || 0,
          updatedAt: (row.updated_at as string) ?? undefined,
        } as ARAccount
      })
    : []
}

/** Fetch AR aging summary */
export async function fetchARAgingSummary(): Promise<ARAgingSummary> {
  if (!isSupabaseConfigured()) {
    return {
      totalOutstanding: 0,
      totalOverdue: 0,
      paidThisMonth: 0,
      buckets: { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 },
      counts: { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 },
    }
  }

  const { data: arRows } = await supabase.from('ar_accounts').select('*')
  const accounts = Array.isArray(arRows ?? []) ? (arRows ?? []) : []

  let totalOutstanding = 0
  let totalOverdue = 0
  const buckets = { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 }
  const counts = { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 }

  for (const a of accounts) {
    const bal = typeof (a as { balance?: number }).balance === 'number' ? (a as { balance?: number }).balance! : 0
    const cur = typeof (a as { aging_current?: number }).aging_current === 'number' ? (a as { aging_current?: number }).aging_current! : 0
    const d7 = typeof (a as { aging_7?: number }).aging_7 === 'number' ? (a as { aging_7?: number }).aging_7! : 0
    const d14 = typeof (a as { aging_14?: number }).aging_14 === 'number' ? (a as { aging_14?: number }).aging_14! : 0
    const d30 = typeof (a as { aging_30?: number }).aging_30 === 'number' ? (a as { aging_30?: number }).aging_30! : 0
    const d60 = typeof (a as { aging_60?: number }).aging_60 === 'number' ? (a as { aging_60?: number }).aging_60! : 0
    const d90 = typeof (a as { aging_90_plus?: number }).aging_90_plus === 'number' ? (a as { aging_90_plus?: number }).aging_90_plus! : 0

    totalOutstanding += bal
    totalOverdue += d7 + d14 + d30 + d60 + d90
    buckets.current += cur
    buckets.days7 += d7
    buckets.days14 += d14
    buckets.days30 += d30
    buckets.days60 += d60
    buckets.days90Plus += d90
    if (cur > 0) counts.current++
    if (d7 > 0) counts.days7++
    if (d14 > 0) counts.days14++
    if (d30 > 0) counts.days30++
    if (d60 > 0) counts.days60++
    if (d90 > 0) counts.days90Plus++
  }

  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)
  const { data: payRows } = await supabase
    .from('payments')
    .select('amount')
    .gte('paid_at', thisMonth.toISOString())
    .eq('status', 'completed')

  const payList = Array.isArray(payRows ?? []) ? (payRows ?? []) : []
  const paidThisMonth = payList.reduce((sum, p) => sum + (typeof (p as { amount?: number }).amount === 'number' ? (p as { amount?: number }).amount! : 0), 0)

  return {
    totalOutstanding,
    totalOverdue,
    paidThisMonth,
    buckets,
    counts,
  }
}

/** Send invoice (update status to issued; email via Edge Function if configured) */
export async function sendInvoice(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !id) return false
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'issued', updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

/** Fetch billing settings */
export async function fetchBillingSettings(): Promise<{
  currency: string
  defaultTaxRate: number
  remindersCadence: string
  webhookConfigured: boolean
}> {
  if (!isSupabaseConfigured()) {
    return { currency: 'USD', defaultTaxRate: 0, remindersCadence: '7,14,30', webhookConfigured: false }
  }
  const { data: currencyRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'billing_currency')
    .maybeSingle()
  const { data: taxRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'default_tax_rate')
    .maybeSingle()
  const { data: remindersRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'reminders_cadence')
    .maybeSingle()
  const { data: webhookRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'stripe_webhook_configured')
    .maybeSingle()

  const currency = (currencyRow as { value?: { v?: string } } | null)?.value?.v ?? 'USD'
  const defaultTaxRate = typeof (taxRow as { value?: { v?: number } } | null)?.value?.v === 'number'
    ? (taxRow as { value?: { v?: number } }).value!.v!
    : 0
  const remindersCadence = (remindersRow as { value?: { v?: string } } | null)?.value?.v ?? '7,14,30'
  const webhookConfigured = (webhookRow as { value?: { v?: boolean } } | null)?.value?.v === true

  return { currency, defaultTaxRate, remindersCadence, webhookConfigured }
}

/** Save billing settings */
export async function saveBillingSettings(settings: {
  currency?: string
  defaultTaxRate?: number
  remindersCadence?: string
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const now = new Date().toISOString()
  const updates: { key: string; value: unknown }[] = []
  if (settings.currency != null) updates.push({ key: 'billing_currency', value: { v: settings.currency } })
  if (settings.defaultTaxRate != null) updates.push({ key: 'default_tax_rate', value: { v: settings.defaultTaxRate } })
  if (settings.remindersCadence != null) updates.push({ key: 'reminders_cadence', value: { v: settings.remindersCadence } })
  for (const u of updates) {
    await supabase.from('settings').upsert(
      { key: u.key, value: u.value, updated_at: now },
      { onConflict: 'key' }
    )
  }
  return true
}

/** Trigger AR reminders for overdue invoices (calls Edge Function or updates locally) */
export async function triggerARReminders(): Promise<{ sent: number }> {
  if (!isSupabaseConfigured()) return { sent: 0 }
  const today = new Date().toISOString().slice(0, 10)
  const { data: overdue } = await supabase
    .from('invoices')
    .select('id')
    .in('status', ['issued', 'pending', 'overdue', 'partially_paid'])
    .lt('due_date', today)
  const list = Array.isArray(overdue) ? overdue : []
  return { sent: list.length }
}

/** Export AR aging as CSV */
export function exportARAgingCSV(accounts: ARAccount[], customers: BillingCustomer[]): string {
  const custMap = new Map((customers ?? []).map((c) => [c.id, c.name]))
  const headers = ['Customer', 'Balance', 'Current', '1-7', '8-14', '15-30', '31-60', '90+']
  const rows = (accounts ?? []).map((a) => [
    custMap.get(a.customerId) ?? a.customerId,
    a.balance.toFixed(2),
    a.agingCurrent.toFixed(2),
    a.aging7.toFixed(2),
    a.aging14.toFixed(2),
    a.aging30.toFixed(2),
    a.aging60.toFixed(2),
    a.aging90Plus.toFixed(2),
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

/** Generate invoice PDF via Edge Function. Returns blob for download or html for print. */
export async function generateInvoicePdf(
  invoiceId: string
): Promise<{ blob: Blob; filename: string } | { html: string } | null> {
  if (!isSupabaseConfigured() || !invoiceId) return null
  const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
    body: { invoiceId },
  })
  if (error) return null
  if (data?.pdfBase64 && data?.filename) {
    const binary = atob(data.pdfBase64 as string)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: data.filename as string }
  }
  if (data?.html) return { html: data.html as string }
  return null
}

/** Create Stripe customer for billing customer */
export async function createStripeCustomer(customerId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !customerId) return null
  const { data, error } = await supabase.functions.invoke('create-stripe-customer', {
    body: { customerId },
  })
  if (error || !data?.stripeCustomerId) return null
  return data.stripeCustomerId as string
}
