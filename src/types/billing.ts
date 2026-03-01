/**
 * Billing & Invoicing TypeScript interfaces
 * Strongly-typed models for customers, invoices, payments, subscriptions, AR
 */

/** Billing address structure */
export interface BillingAddress {
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

/** Tax information for customer */
export interface TaxInfo {
  taxId?: string
  taxExempt?: boolean
  taxExemptReason?: string
}

/** Customer with billing details */
export interface BillingCustomer {
  id: string
  name: string
  email: string
  userId?: string | null
  billingAddress?: BillingAddress | null
  currency: string
  stripeCustomerId?: string | null
  taxInfo?: TaxInfo | null
  billingContact?: string | null
  createdAt: string
  updatedAt?: string
}

/** Invoice status */
export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'refunded'
  | 'partially_paid'

/** Invoice line item */
export interface InvoiceItem {
  id?: string
  invoiceId?: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  taxRate?: number
  taxAmount?: number
  discountAmount?: number
}

/** Invoice with line items and payments */
export interface Invoice {
  id: string
  customerId: string
  invoiceId: string
  status: InvoiceStatus
  dueDate: string
  issueDate: string
  date?: string
  totalAmount: number
  taxes: number
  discounts: number
  currency: string
  stripeInvoiceId?: string | null
  subscriptionId?: string | null
  pdfPath?: string | null
  items?: InvoiceItem[]
  payments?: Payment[]
  createdAt: string
  updatedAt?: string
}

/** Payment method */
export type PaymentMethod = 'card' | 'bank' | 'cash' | 'check' | 'other'

/** Payment status */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

/** Payment record */
export interface Payment {
  id: string
  invoiceId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paidAt: string
  stripePaymentIntentId?: string | null
  createdAt?: string
}

/** Subscription status */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete'

/** Subscription */
export interface Subscription {
  id: string
  customerId: string
  stripeSubscriptionId?: string | null
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  planId?: string | null
  quantity: number
  trialEnd?: string | null
  cancelAt?: string | null
  proration: boolean
  createdAt?: string
  updatedAt?: string
}

/** AR aging buckets */
export interface ARAccount {
  id: string
  customerId: string
  balance: number
  lastPaymentDate?: string | null
  agingCurrent: number
  aging7: number
  aging14: number
  aging30: number
  aging60: number
  aging90Plus: number
  updatedAt?: string
}

/** AR aging summary for dashboard */
export interface ARAgingSummary {
  totalOutstanding: number
  totalOverdue: number
  paidThisMonth: number
  buckets: {
    current: number
    days7: number
    days14: number
    days30: number
    days60: number
    days90Plus: number
  }
  counts: {
    current: number
    days7: number
    days14: number
    days30: number
    days60: number
    days90Plus: number
  }
}

/** Create/update customer payload */
export interface CustomerCreatePayload {
  name: string
  email: string
  billingAddress?: BillingAddress
  currency?: string
  billingContact?: string
}

/** Create invoice payload */
export interface InvoiceCreatePayload {
  customerId: string
  dueDate: string
  issueDate?: string
  currency?: string
  items: Omit<InvoiceItem, 'id' | 'invoiceId' | 'lineTotal' | 'taxAmount'>[]
  taxes?: number
  discounts?: number
}

/** Record payment payload */
export interface PaymentRecordPayload {
  invoiceId: string
  amount: number
  method?: PaymentMethod
}

/** Create subscription payload */
export interface SubscriptionCreatePayload {
  customerId: string
  planId: string
  quantity?: number
  trialDays?: number
  proration?: boolean
}
