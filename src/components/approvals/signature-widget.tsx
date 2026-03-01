/**
 * SignatureWidget - Electronic signature capture for approvals
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PenLine, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ApprovalSignature } from '@/types/approvals'

const signatureSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Name must be 200 characters or less'),
  role: z
    .string()
    .min(1, 'Role is required')
    .max(100, 'Role must be 100 characters or less'),
})

type SignatureFormValues = z.infer<typeof signatureSchema>

export interface SignatureWidgetProps {
  existingSignature?: ApprovalSignature | null
  signerName?: string
  signerRole?: string
  onSign?: (payload: { name: string; role: string }) => Promise<void>
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

export function SignatureWidget({
  existingSignature,
  signerName: defaultName = '',
  signerRole: defaultRole = '',
  onSign,
  disabled = false,
  isLoading = false,
  className,
}: SignatureWidgetProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: { name: defaultName, role: defaultRole },
  })

  const nameValue = watch('name')
  const roleValue = watch('role')
  const canSign =
    !Boolean(existingSignature?.id) &&
    Boolean(onSign) &&
    (nameValue?.trim()?.length ?? 0) > 0 &&
    (roleValue?.trim()?.length ?? 0) > 0

  useEffect(() => {
    reset({ name: defaultName, role: defaultRole })
  }, [defaultName, defaultRole, reset])

  const hasSignature = Boolean(existingSignature?.id)

  const onSubmit = async (data: SignatureFormValues) => {
    if (!onSign || hasSignature) return
    try {
      await onSign({ name: data.name.trim(), role: data.role.trim() })
      toast.success('Signed successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signing failed'
      toast.error(message)
    }
  }

  if (hasSignature && existingSignature) {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-muted/30 p-4 shadow-card',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-success">
          <Check className="h-5 w-5 shrink-0" aria-hidden />
          <span className="font-semibold">Signed</span>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">By:</span>{' '}
            {existingSignature.signerName ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span>{' '}
            {existingSignature.signerRole ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Date:</span>{' '}
            {existingSignature.signedAt
              ? format(new Date(existingSignature.signedAt), 'PPpp')
              : '—'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-4 shadow-card',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">
          Electronic Signature
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your name and role to sign this approval.
      </p>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 space-y-4"
        noValidate
        aria-label="Electronic signature form"
      >
        <div className="space-y-2">
          <Label htmlFor="sig-name">Full Name</Label>
          <Input
            id="sig-name"
            type="text"
            placeholder="Your full name"
            disabled={disabled || isLoading}
            autoComplete="name"
            aria-label="Full name for signature"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'sig-name-error' : undefined}
            className={cn('mt-1', errors.name && 'border-destructive')}
            {...register('name')}
          />
          {errors.name && (
            <p
              id="sig-name-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sig-role">Role</Label>
          <Input
            id="sig-role"
            type="text"
            placeholder="e.g. Lab Manager"
            disabled={disabled || isLoading}
            autoComplete="organization-title"
            aria-label="Role or job title for signature"
            aria-invalid={!!errors.role}
            aria-describedby={errors.role ? 'sig-role-error' : undefined}
            className={cn('mt-1', errors.role && 'border-destructive')}
            {...register('role')}
          />
          {errors.role && (
            <p
              id="sig-role-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.role.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={!canSign || disabled || isLoading || isSubmitting}
          size="sm"
          className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing…
            </>
          ) : (
            'Sign'
          )}
        </Button>
      </form>
    </div>
  )
}
