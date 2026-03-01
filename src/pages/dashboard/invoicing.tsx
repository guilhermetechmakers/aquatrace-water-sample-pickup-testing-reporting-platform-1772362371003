/**
 * Invoicing & Accounts Receivable - Create, send, track, reconcile invoices
 * AR aging, reminders, export, payment recording
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  InvoiceListTable,
  InvoiceEditor,
  ARDashboard,
  RecordPaymentDialog,
} from '@/components/billing'
import {
  useInvoices,
  useBillingCustomers,
  useARAgingSummary,
  useARAccounts,
  useCreateInvoice,
  useRecordPayment,
} from '@/hooks/useBilling'
import { exportARAgingCSV } from '@/api/billing'
import type { Invoice } from '@/types/billing'

export function InvoicingPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  const { data: invoicesData, isLoading } = useInvoices({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 20,
  })
  const { data: customersData } = useBillingCustomers({ limit: 200 })
  const { data: arSummary, isLoading: arLoading } = useARAgingSummary()
  const { data: arAccounts = [] } = useARAccounts()

  const createInvoice = useCreateInvoice()
  const recordPayment = useRecordPayment()

  const invoices = Array.isArray(invoicesData?.invoices) ? invoicesData!.invoices : []
  const count = invoicesData?.count ?? 0
  const customers = Array.isArray(customersData?.customers) ? customersData!.customers : []

  const handleCreateInvoice = (payload: Parameters<typeof createInvoice.mutateAsync>[0]) => {
    createInvoice.mutate(payload, { onSuccess: () => setShowCreate(false) })
  }

  const handleRecordPayment = (invoiceId: string, amount: number) => {
    recordPayment.mutate({ invoiceId, amount }, { onSuccess: () => setPaymentInvoice(null) })
  }

  const handleExportCSV = () => {
    const csv = exportARAgingCSV(arAccounts, customers)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ar-aging-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoicing & AR</h1>
          <p className="text-muted-foreground mt-1">
            Create, send, and track invoices. Manage accounts receivable.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <ARDashboard
        summary={arSummary ?? undefined}
        isLoading={arLoading}
        onExportCSV={handleExportCSV}
        onScheduleReminders={() => {}}
      />

      {showCreate ? (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <label className="text-sm font-medium">Customer</label>
              <select
                value={selectedCustomerId ?? ''}
                onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            {selectedCustomerId && selectedCustomer && (
              <InvoiceEditor
                customerId={selectedCustomerId}
                customerName={selectedCustomer.name}
                dueDate={dueDate}
                onSave={handleCreateInvoice}
                onCancel={() => setShowCreate(false)}
                isLoading={createInvoice.isPending}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <InvoiceListTable
          invoices={invoices}
          count={count}
          page={page}
          limit={20}
          isLoading={isLoading}
          search={search}
          statusFilter={statusFilter}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onPageChange={setPage}
          onRecordPayment={(inv) => setPaymentInvoice(inv)}
        />
      )}

      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        onRecord={handleRecordPayment}
        isLoading={recordPayment.isPending}
      />
    </div>
  )
}
