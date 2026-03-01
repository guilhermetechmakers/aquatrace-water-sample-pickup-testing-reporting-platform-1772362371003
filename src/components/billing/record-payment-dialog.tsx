/**
 * RecordPaymentDialog - Record a payment against an invoice
 */

import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Invoice } from '@/types/billing'

export interface RecordPaymentDialogProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecord: (invoiceId: string, amount: number) => void
  isLoading?: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onRecord,
  isLoading = false,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const total = typeof invoice?.totalAmount === 'number' ? invoice.totalAmount : 0
  const paidTotal = (invoice?.payments ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const balanceDue = total - paidTotal

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!invoice || isNaN(amt) || amt <= 0) return
    onRecord(invoice.id, amt)
    setAmount('')
    onOpenChange(false)
  }

  const handleClose = () => {
    setAmount('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {invoice ? (
              <>
                Invoice {invoice.invoiceId} — Balance due: {formatCurrency(balanceDue)}
              </>
            ) : (
              'Select an invoice to record a payment'
            )}
          </DialogDescription>
        </DialogHeader>
        {invoice && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min={0.01}
                max={balanceDue}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={formatCurrency(balanceDue)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Balance due: {formatCurrency(balanceDue)}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
              >
                {isLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
