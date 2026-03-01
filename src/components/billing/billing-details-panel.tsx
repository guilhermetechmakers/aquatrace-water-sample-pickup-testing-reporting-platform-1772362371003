/**
 * BillingDetailsPanel - Billing terms, tax IDs, payment methods, default currency
 * Embedded within AdminCustomerForm / CustomerFormDialog
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaxInfo } from '@/types/billing'

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on receipt'] as const

export interface BillingDetailsPanelProps {
  currency: string
  taxId?: string
  taxExempt?: boolean
  taxExemptReason?: string
  paymentTerms?: string
  onCurrencyChange: (value: string) => void
  onTaxInfoChange: (info: Partial<TaxInfo>) => void
  onPaymentTermsChange?: (value: string) => void
  disabled?: boolean
}

export function BillingDetailsPanel({
  currency,
  taxId = '',
  taxExempt = false,
  taxExemptReason = '',
  paymentTerms = 'Net 30',
  onCurrencyChange,
  onTaxInfoChange,
  onPaymentTermsChange,
  disabled = false,
}: BillingDetailsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Billing Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Default Currency</Label>
          <Select
            value={currency}
            onValueChange={onCurrencyChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">Tax ID / VAT Number</Label>
          <Input
            id="taxId"
            value={taxId}
            onChange={(e) => onTaxInfoChange({ taxId: e.target.value })}
            placeholder="e.g. 12-3456789"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="taxExempt">Tax Exempt</Label>
            <p className="text-xs text-muted-foreground">
              Customer is exempt from sales tax
            </p>
          </div>
          <Switch
            id="taxExempt"
            checked={taxExempt}
            onCheckedChange={(checked) =>
              onTaxInfoChange({ taxExempt: checked })
            }
            disabled={disabled}
          />
        </div>
        {taxExempt && (
          <div className="space-y-2">
            <Label htmlFor="taxExemptReason">Tax Exempt Reason</Label>
            <Input
              id="taxExemptReason"
              value={taxExemptReason}
              onChange={(e) =>
                onTaxInfoChange({ taxExemptReason: e.target.value })
              }
              placeholder="e.g. Non-profit organization"
              disabled={disabled}
            />
          </div>
        )}
        {onPaymentTermsChange && (
          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Select
              value={paymentTerms}
              onValueChange={onPaymentTermsChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
