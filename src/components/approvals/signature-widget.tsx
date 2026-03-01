/**
 * SignatureWidget - Electronic signature capture for approvals
 */

import { useState } from 'react'
import { PenLine, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ApprovalSignature } from '@/types/approvals'

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
  const [name, setName] = useState(defaultName)
  const [role, setRole] = useState(defaultRole)
  const [submitting, setSubmitting] = useState(false)

  const hasSignature = Boolean(existingSignature?.id)
  const canSign = !hasSignature && onSign && (name.trim().length > 0) && (role.trim().length > 0)

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSign || submitting) return
    setSubmitting(true)
    try {
      await onSign({ name: name.trim(), role: role.trim() })
    } finally {
      setSubmitting(false)
    }
  }

  if (hasSignature && existingSignature) {
    return (
      <div className={cn('rounded-lg border bg-muted/30 p-4', className)}>
        <div className="flex items-center gap-2 text-success">
          <Check className="h-5 w-5" />
          <span className="font-semibold">Signed</span>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">By:</span> {existingSignature.signerName}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {existingSignature.signerRole}
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
    <div className={cn('rounded-lg border bg-muted/30 p-4', className)}>
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-primary" />
        <span className="font-semibold">Electronic Signature</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        Enter your name and role to sign this approval.
      </p>
      <form onSubmit={handleSign} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="sig-name">Full Name</Label>
          <Input
            id="sig-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            disabled={disabled || isLoading}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="sig-role">Role</Label>
          <Input
            id="sig-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Lab Manager"
            disabled={disabled || isLoading}
            className="mt-1"
          />
        </div>
        <Button
          type="submit"
          disabled={!canSign || disabled || isLoading || submitting}
          size="sm"
        >
          {submitting ? 'Signing…' : 'Sign'}
        </Button>
      </form>
    </div>
  )
}
