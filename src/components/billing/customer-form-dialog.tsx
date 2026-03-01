/**
 * CustomerFormDialog - Create/edit customer with billing details
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BillingCustomer, BillingAddress } from '@/types/billing'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  billingContact: z.string().optional(),
  currency: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export interface CustomerFormDialogProps {
  customer?: BillingCustomer | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    email: string
    billingContact?: string
    currency?: string
    billingAddress?: BillingAddress
  }) => void
  isLoading?: boolean
}

export function CustomerFormDialog({
  customer,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer?.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      billingContact: '',
      currency: 'USD',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? '',
        email: customer?.email ?? '',
        billingContact: customer?.billingContact ?? '',
        currency: customer?.currency ?? 'USD',
        line1: customer?.billingAddress?.line1 ?? '',
        line2: customer?.billingAddress?.line2 ?? '',
        city: customer?.billingAddress?.city ?? '',
        state: customer?.billingAddress?.state ?? '',
        postalCode: customer?.billingAddress?.postalCode ?? '',
        country: customer?.billingAddress?.country ?? '',
      })
    }
  }, [open, customer, reset])

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      email: data.email,
      billingContact: data.billingContact || undefined,
      currency: data.currency || 'USD',
      billingAddress:
        data.line1 || data.city || data.country
          ? {
              line1: data.line1,
              line2: data.line2,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              country: data.country,
            }
          : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update customer billing details' : 'Create a new customer profile'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} className="mt-1" />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1"
                disabled={isEdit}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="billingContact">Billing Contact</Label>
            <Input id="billingContact" {...register('billingContact')} className="mt-1" />
          </div>
          <div>
            <Label>Billing Address</Label>
            <div className="grid gap-2 mt-1">
              <Input placeholder="Line 1" {...register('line1')} />
              <Input placeholder="Line 2" {...register('line2')} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="City" {...register('city')} />
                <Input placeholder="State" {...register('state')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Postal Code" {...register('postalCode')} />
                <Input placeholder="Country" {...register('country')} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
