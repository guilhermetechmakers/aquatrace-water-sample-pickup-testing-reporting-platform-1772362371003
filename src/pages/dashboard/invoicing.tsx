/**
 * Invoicing & Accounts Receivable - Create, send, track, reconcile invoices
 * AR aging, reminders, export, payment recording
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  InvoiceListTable,
  InvoiceEditor,
  ARDashboard,
  RecordPaymentDialog,
  ARRemindersDialog,
} from '@/components/billing'
import {
  useInvoices,
  useBillingCustomers,
  useARAgingSummary,
  useARAccounts,
  useCreateInvoice,
  useRecordPayment,
  useSendInvoice,
  useTriggerARReminders,
  useSaveBillingSettings,
} from '@/hooks/useBilling'
import { exportARAgingCSV } from '@/api/billing'
import type { Invoice } from '@/types/billing'

export function InvoicingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const customerFromUrl = searchParams.get('customer') ?? ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState(customerFromUrl)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showReminders, setShowReminders] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })

  const { data: invoicesData, isLoading } = useInvoices({
    status: statusFilter || undefined,
    customerId: customerFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
    page,
    limit: 20,
  })
  const { data: customersData } = useBillingCustomers({ limit: 200 })
  const { data: arSummary, isLoading: arLoading } = useARAgingSummary()
  const { data: arAccounts = [] } = useARAccounts()

  const createInvoice = useCreateInvoice()
  const recordPayment = useRecordPayment()
  const sendInvoice = useSendInvoice()
  const triggerReminders = useTriggerARReminders()
  const saveBillingSettings = useSaveBillingSettings()

  const invoices = Array.isArray(invoicesData?.invoices) ? invoicesData!.invoices : []
  const count = invoicesData?.count ?? 0
  const customers = Array.isArray(customersData?.customers) ? customersData!.customers : []

  const handleCreateInvoice = (payload: Parameters<typeof createInvoice.mutateAsync>[0]) => {
    createInvoice.mutate(payload, { onSuccess: () => setShowCreate(false) })
  }

  const handleRecordPayment = (invoiceId: string, amount: number, method?: import('@/types/billing').PaymentMethod) => {
    recordPayment.mutate({ invoiceId, amount, method }, { onSuccess: () => setPaymentInvoice(null) })
  }

  const handleSendInvoice = (inv: Invoice) => {
    sendInvoice.mutate(inv.id)
  }

  const handleDownloadInvoice = (inv: Invoice) => {
    navigate(`/dashboard/invoicing/${inv.id}`)
  }

  const handleRowClick = (inv: Invoice) => {
    navigate(`/dashboard/invoicing/${inv.id}`)
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

  const handleExportPDF = () => {
    const custMap = new Map((customers ?? []).map((c) => [c.id, c.name]))
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const rows = (arAccounts ?? []).map((a) => {
      const name = custMap.get(a.customerId) ?? a.customerId
      return `<tr><td>${name}</td><td>${a.balance.toFixed(2)}</td><td>${a.agingCurrent.toFixed(2)}</td><td>${a.aging7.toFixed(2)}</td><td>${a.aging14.toFixed(2)}</td><td>${a.aging30.toFixed(2)}</td><td>${a.aging60.toFixed(2)}</td><td>${a.aging90Plus.toFixed(2)}</td></tr>`
    }).join('')
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>AR Aging Report</title>
      <style>body{font-family:Inter,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border:1px solid #ddd}th{background:#f5f5f5}</style>
      </head><body><h1>AR Aging Report</h1><p>Generated: ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>Customer</th><th>Balance</th><th>Current</th><th>1-7</th><th>8-14</th><th>15-30</th><th>31-60</th><th>90+</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`)
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
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
        onExportPDF={handleExportPDF}
        onScheduleReminders={() => setShowReminders(true)}
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
          customerFilter={customerFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          customers={customers}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onCustomerFilterChange={setCustomerFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onPageChange={setPage}
          onSend={handleSendInvoice}
          onDownload={handleDownloadInvoice}
          onRecordPayment={(inv) => setPaymentInvoice(inv)}
          onRowClick={handleRowClick}
        />
      )}

      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        onRecord={handleRecordPayment}
        isLoading={recordPayment.isPending}
      />

      <ARRemindersDialog
        open={showReminders}
        onOpenChange={setShowReminders}
        onSchedule={(cadence) => {
          saveBillingSettings.mutate(
            { remindersCadence: cadence },
            {
              onSuccess: () => {
                triggerReminders.mutate()
                setShowReminders(false)
              },
            }
          )
        }}
      />
    </div>
  )
}
