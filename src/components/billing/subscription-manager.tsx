/**
 * SubscriptionManager - UI for creating/editing subscriptions, proration rules, billing cycles, trial settings
 */

import { useState } from 'react'
import { CreditCard, Calendar, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Subscription } from '@/types/billing'
import { cn } from '@/lib/utils'

export interface SubscriptionManagerProps {
  customerId: string
  customerName?: string
  subscriptions?: Subscription[]
  isLoading?: boolean
  onCreate?: (payload: {
    customerId: string
    planId: string
    quantity?: number
    trialDays?: number
    proration?: boolean
  }) => void
}

function formatDate(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/20 text-success',
  trialing: 'bg-accent/20 text-accent-foreground',
  canceled: 'bg-muted text-muted-foreground',
  past_due: 'bg-destructive/20 text-destructive',
  incomplete: 'bg-warning/20 text-warning',
}

export function SubscriptionManager({
  customerId,
  customerName,
  subscriptions = [],
  isLoading = false,
  onCreate,
}: SubscriptionManagerProps) {
  const [planId, setPlanId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [trialDays, setTrialDays] = useState(0)
  const [proration, setProration] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const list = Array.isArray(subscriptions) ? subscriptions : []

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!(planId ?? '').trim()) return
    onCreate?.({
      customerId,
      planId: planId.trim(),
      quantity,
      trialDays: trialDays > 0 ? trialDays : undefined,
      proration,
    })
    setPlanId('')
    setQuantity(1)
    setTrialDays(0)
    setProration(true)
    setShowForm(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Subscriptions
            </CardTitle>
            <CardDescription>
              {customerName ? `Recurring billing for ${customerName}` : 'Manage recurring billing'}
            </CardDescription>
          </div>
          {onCreate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'New Subscription'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForm && onCreate && (
          <form onSubmit={handleCreate} className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="planId">Plan ID</Label>
                <Input
                  id="planId"
                  placeholder="e.g. water_testing_monthly"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="trialDays">Trial Days (0 = no trial)</Label>
                <Input
                  id="trialDays"
                  type="number"
                  min={0}
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="proration"
                  checked={proration}
                  onCheckedChange={setProration}
                />
                <Label htmlFor="proration" className="flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Proration
                </Label>
              </div>
            </div>
            <Button type="submit" disabled={!(planId ?? '').trim()}>
              Create Subscription
            </Button>
          </form>
        )}

        {list.length === 0 && !showForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No subscriptions yet</p>
            {onCreate && (
              <Button variant="outline" className="mt-2" onClick={() => setShowForm(true)}>
                Create first subscription
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{sub.planId ?? 'Plan'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      STATUS_COLORS[sub.status] ?? 'bg-muted'
                    )}
                  >
                    {sub.status}
                  </span>
                  <span className="text-sm text-muted-foreground">Qty: {sub.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
