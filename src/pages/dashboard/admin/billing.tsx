/**
 * Admin Billing Settings - Stripe webhook config, tax settings, reminders cadence
 */

import { AdminSettingsPanel } from '@/components/billing'

export function AdminBillingPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure Stripe webhooks, tax defaults, and reminder cadence
        </p>
      </div>
      <AdminSettingsPanel
        currency="USD"
        defaultTaxRate={0}
        remindersCadence="7,14,30"
        webhookConfigured={false}
      />
    </div>
  )
}
