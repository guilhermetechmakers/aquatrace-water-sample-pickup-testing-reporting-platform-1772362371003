/**
 * SignatureBlock - Render manager signature image with timestamp; fallback to placeholder
 */

import { Check, PenLine } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ReportSignature } from '@/types/reports'

export interface SignatureBlockProps {
  signature?: ReportSignature | null
  signerName?: string
  signerRole?: string
  signedAt?: string
  className?: string
}

export function SignatureBlock({
  signature,
  signerName,
  signerRole,
  signedAt,
  className,
}: SignatureBlockProps) {
  const name = signature?.signerName ?? signerName ?? '—'
  const role = signature?.signerRole ?? signerRole ?? '—'
  const at = signature?.signedAt ?? signedAt ?? ''
  const imageUrl = signature?.signatureImageUrl ?? null

  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/30 p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-success">
        <Check className="h-5 w-5" />
        <span className="font-semibold">Signed</span>
      </div>
      <div className="mt-3 space-y-2">
        {imageUrl ? (
          <div className="mb-2">
            <img
              src={imageUrl}
              alt="Manager signature"
              className="max-h-16 max-w-[200px] object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <PenLine className="h-4 w-4" />
            <span className="text-sm">Electronic signature on file</span>
          </div>
        )}
        <p className="text-sm">
          <span className="text-muted-foreground">By:</span> {name}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Role:</span> {role}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Date:</span>{' '}
          {at ? format(new Date(at), 'PPpp') : '—'}
        </p>
      </div>
    </div>
  )
}
