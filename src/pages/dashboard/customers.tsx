/**
 * Customer Management (Admin) - Create/edit customer profiles, billing details, subscriptions, invoice history
 */

import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  InvoiceEditor,
  SubscriptionManager,
  CustomerProfileCard,
  CustomerFormDialog,
} from '@/components/billing'
import {
  useBillingCustomers,
  useBillingCustomer,
  useInvoices,
  useSubscriptions,
  useCreateBillingCustomer,
  useUpdateBillingCustomer,
  useCreateInvoice,
  useCreateSubscription,
} from '@/hooks/useBilling'
import type { BillingCustomer } from '@/types/billing'

export function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<BillingCustomer | null>(null)
  const [createInvoiceFor, setCreateInvoiceFor] = useState<BillingCustomer | null>(null)

  const { data: customersData, isLoading } = useBillingCustomers({
    search: search || undefined,
    page: 1,
    limit: 50,
  })
  const { data: customer, isLoading: customerLoading } = useBillingCustomer(selectedId)
  const { data: subscriptions = [] } = useSubscriptions(selectedId)
  const { data: invoicesData } = useInvoices({
    customerId: selectedId ?? undefined,
    limit: 10,
  })
  const createCustomer = useCreateBillingCustomer()
  const updateCustomer = useUpdateBillingCustomer()
  const createInvoice = useCreateInvoice()
  const createSubscription = useCreateSubscription()

  const customers = Array.isArray(customersData?.customers) ? customersData!.customers : []
  const invoices = Array.isArray(invoicesData?.invoices) ? invoicesData!.invoices : []

  const handleAddCustomer = () => {
    setEditingCustomer(null)
    setFormOpen(true)
  }

  const handleEditCustomer = (c: BillingCustomer) => {
    setEditingCustomer(c)
    setFormOpen(true)
  }

  const handleFormSubmit = (data: Parameters<typeof createCustomer.mutateAsync>[0]) => {
    if (editingCustomer) {
      updateCustomer.mutate(
        { id: editingCustomer.id, payload: data },
        { onSuccess: () => setFormOpen(false) }
      )
    } else {
      createCustomer.mutate(data, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleCreateInvoice = (payload: Parameters<typeof createInvoice.mutateAsync>[0]) => {
    createInvoice.mutate(payload, {
      onSuccess: () => setCreateInvoiceFor(null),
    })
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer profiles, billing details, and subscriptions
          </p>
        </div>
        <Button onClick={handleAddCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No customers yet</p>
                    <Button variant="outline" className="mt-2" onClick={handleAddCustomer}>
                      Add first customer
                    </Button>
                  </div>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full flex items-center gap-3 p-4 text-left border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                        selectedId === c.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <Users className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedId ? (
            <>
              <CustomerProfileCard
                customer={customer ?? undefined}
                subscriptions={subscriptions}
                recentInvoices={invoices}
                isLoading={customerLoading}
                onEdit={() => customer && handleEditCustomer(customer)}
                onViewInvoices={() => {}}
              />
              <SubscriptionManager
                customerId={selectedId}
                customerName={customer?.name}
                subscriptions={subscriptions}
                onCreate={(p) => createSubscription.mutate(p)}
              />
              {createInvoiceFor ? (
                <InvoiceEditor
                  customerId={createInvoiceFor.id}
                  customerName={createInvoiceFor.name}
                  dueDate={dueDate.toISOString().slice(0, 10)}
                  onSave={handleCreateInvoice}
                  onCancel={() => setCreateInvoiceFor(null)}
                  isLoading={createInvoice.isPending}
                />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => customer && setCreateInvoiceFor(customer)}
                >
                  Create Invoice for {customer?.name}
                </Button>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a customer to view profile and manage billing</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CustomerFormDialog
        customer={editingCustomer}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        isLoading={createCustomer.isPending || updateCustomer.isPending}
      />
    </div>
  )
}
