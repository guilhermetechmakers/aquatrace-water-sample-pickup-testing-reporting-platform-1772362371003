/**
 * InvoiceEditor - Line-item editor with quantity, unit price, tax rate, discount, total calculation
 */

import { useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { InvoiceItem } from '@/types/billing'
import { cn } from '@/lib/utils'

export interface InvoiceEditorProps {
  customerId: string
  customerName?: string
  dueDate: string
  onSave: (payload: {
    customerId: string
    dueDate: string
    issueDate: string
    items: Omit<InvoiceItem, 'id' | 'invoiceId' | 'lineTotal' | 'taxAmount'>[]
    taxes?: number
    discounts?: number
  }) => void
  onCancel?: () => void
  isLoading?: boolean
}

const emptyItem: Omit<InvoiceItem, 'id' | 'invoiceId' | 'lineTotal' | 'taxAmount'> = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0,
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function InvoiceEditor({
  customerId,
  customerName,
  dueDate,
  onSave,
  onCancel,
  isLoading = false,
}: InvoiceEditorProps) {
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'invoiceId' | 'lineTotal' | 'taxAmount'>[]>(() => [
    { ...emptyItem },
  ])
  const [taxes, setTaxes] = useState(0)
  const [discounts, setDiscounts] = useState(0)
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10))

  const updateItem = useCallback((index: number, field: string, value: string | number) => {
    setItems((prev) => {
      const next = [...(prev ?? [])]
      const item = next[index] ?? { ...emptyItem }
      if (field === 'description') item.description = String(value)
      if (field === 'quantity') item.quantity = parseFloat(String(value)) || 0
      if (field === 'unitPrice') item.unitPrice = parseFloat(String(value)) || 0
      if (field === 'taxRate') item.taxRate = parseFloat(String(value)) || 0
      next[index] = item
      return next
    })
  }, [])

  const addItem = useCallback(() => {
    setItems((prev) => [...(prev ?? []), { ...emptyItem }])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      const next = [...(prev ?? [])]
      if (next.length <= 1) return next
      next.splice(index, 1)
      return next
    })
  }, [])

  const subtotal = (items ?? []).reduce((sum, it) => {
    const qty = typeof it.quantity === 'number' ? it.quantity : 0
    const up = typeof it.unitPrice === 'number' ? it.unitPrice : 0
    const rate = typeof it.taxRate === 'number' ? it.taxRate : 0
    return sum + qty * up * (1 + rate / 100)
  }, 0)

  const total = subtotal + (typeof taxes === 'number' ? taxes : 0) - (typeof discounts === 'number' ? discounts : 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = (items ?? []).filter((it) => (it.description ?? '').trim().length > 0)
    if (validItems.length === 0) return
    onSave({
      customerId,
      dueDate,
      issueDate,
      items: validItems.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate ?? 0,
      })),
      taxes,
      discounts,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle>New Invoice</CardTitle>
          {customerName && (
            <p className="text-sm text-muted-foreground">Customer: {customerName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={() => {}}
                readOnly
                className="mt-1 bg-muted"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="h-10 px-4 text-left font-medium">Description</th>
                    <th className="h-10 px-4 text-right font-medium w-24">Qty</th>
                    <th className="h-10 px-4 text-right font-medium w-28">Unit Price</th>
                    <th className="h-10 px-4 text-right font-medium w-20">Tax %</th>
                    <th className="h-10 px-4 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-2">
                        <Input
                          placeholder="Description"
                          value={item.description ?? ''}
                          onChange={(e) => updateItem(i, 'description', e.target.value)}
                          className="h-9 border-0 bg-transparent focus-visible:ring-1"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.quantity ?? 1}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          className="h-9 w-full text-right"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitPrice ?? 0}
                          onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          className="h-9 w-full text-right"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={item.taxRate ?? 0}
                          onChange={(e) => updateItem(i, 'taxRate', e.target.value)}
                          className="h-9 w-full text-right"
                        />
                      </td>
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(i)}
                          disabled={(items ?? []).length <= 1}
                          aria-label="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
            <div>
              <Label htmlFor="taxes">Additional Taxes ($)</Label>
              <Input
                id="taxes"
                type="number"
                min={0}
                step={0.01}
                value={taxes}
                onChange={(e) => setTaxes(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="discounts">Discounts ($)</Label>
              <Input
                id="discounts"
                type="number"
                min={0}
                step={0.01}
                value={discounts}
                onChange={(e) => setDiscounts(parseFloat(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>

          <div className={cn('text-right pt-4 border-t border-border')}>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save as Draft'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
