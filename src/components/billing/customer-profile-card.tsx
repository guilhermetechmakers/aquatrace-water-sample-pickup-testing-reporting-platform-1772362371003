/**
 * CustomerProfileCard - Shows customer details, Stripe customer ID, active subscriptions, invoice history, billing contact
 */

import { User, Mail, CreditCard, FileText, MapPin, Link2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { BillingCustomer, Subscription, Invoice } from '@/types/billing'

export interface CustomerProfileCardProps {
  customer?: BillingCustomer | null
  subscriptions?: Subscription[]
  recentInvoices?: Invoice[]
  isLoading?: boolean
  onEdit?: () => void
  onViewInvoices?: () => void
  onLinkStripe?: (customerId: string) => void
  isLinkingStripe?: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function CustomerProfileCard({
  customer,
  subscriptions = [],
  recentInvoices = [],
  isLoading = false,
  onEdit,
  onViewInvoices,
  onLinkStripe,
  isLinkingStripe = false,
}: CustomerProfileCardProps) {
  const subs = Array.isArray(subscriptions) ? subscriptions : []
  const invs = Array.isArray(recentInvoices) ? recentInvoices : []
  const activeSubs = subs.filter((s) => s.status === 'active' || s.status === 'trialing')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!customer) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select a customer to view profile
        </CardContent>
      </Card>
    )
  }

  const addr = customer.billingAddress
  const addrLine = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country]
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {customer.name}
            </CardTitle>
            <CardDescription>{customer.email}</CardDescription>
          </div>
          {onEdit && (
            <Badge variant="outline" className="cursor-pointer" onClick={onEdit}>
              Edit
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {customer.billingContact && (
            <p className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Billing contact: {customer.billingContact}
            </p>
          )}
          {addrLine && (
            <p className="text-sm flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              {addrLine}
            </p>
          )}
          {customer.stripeCustomerId ? (
            <p className="text-sm flex items-center gap-2 font-mono text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              {customer.stripeCustomerId}
            </p>
          ) : onLinkStripe && (
            <button
              type="button"
              onClick={() => onLinkStripe(customer.id)}
              disabled={isLinkingStripe}
              className="text-sm flex items-center gap-2 text-primary hover:underline"
            >
              <Link2 className="h-4 w-4" />
              {isLinkingStripe ? 'Linking...' : 'Link Stripe Customer'}
            </button>
          )}
          <p className="text-sm text-muted-foreground">Currency: {customer.currency ?? 'USD'}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Active Subscriptions ({activeSubs.length})
          </h4>
          {activeSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active subscriptions</p>
          ) : (
            <ul className="space-y-1">
              {activeSubs.slice(0, 3).map((s) => (
                <li key={s.id} className="text-sm">
                  {s.planId ?? 'Plan'} — {s.status}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Recent Invoices
          </h4>
          {invs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          ) : (
            <ul className="space-y-2">
              {invs.slice(0, 5).map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between text-sm cursor-pointer hover:text-primary"
                  onClick={() => onViewInvoices?.()}
                >
                  <span className="font-mono">{inv.invoiceId}</span>
                  <span>{formatCurrency(inv.totalAmount)}</span>
                  <Badge variant={inv.status === 'paid' ? 'approved' : 'pending'}>
                    {inv.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {onViewInvoices && invs.length > 0 && (
            <button
              type="button"
              className="text-sm text-primary hover:underline mt-2"
              onClick={onViewInvoices}
            >
              View all invoices →
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
