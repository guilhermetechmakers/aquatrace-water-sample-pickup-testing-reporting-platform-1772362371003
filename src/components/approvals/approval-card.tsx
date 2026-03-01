/**
 * Approval card for queue list - compact view with status and actions
 */

import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileEdit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ApprovalRequest } from '@/types/approvals'
import { cn } from '@/lib/utils'

export interface ApprovalCardProps {
  approval: ApprovalRequest
  onQuickAction?: (action: 'approve' | 'reject' | 'view') => void
  selected?: boolean
  onSelect?: (selected: boolean) => void
  showCheckbox?: boolean
  className?: string
}

const STATUS_CONFIG: Record<
  ApprovalRequest['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'pending' | 'approved' | 'rejected' | 'warning' }
> = {
  pending: { label: 'Pending Approval', variant: 'pending' },
  under_review: { label: 'Under Review', variant: 'pending' },
  approved: { label: 'Approved', variant: 'approved' },
  rejected: { label: 'Rejected', variant: 'rejected' },
  corrective_action: { label: 'Corrective Action', variant: 'warning' },
}

export function ApprovalCard({
  approval,
  onQuickAction,
  selected = false,
  onSelect,
  showCheckbox = false,
  className,
}: ApprovalCardProps) {
  const config = STATUS_CONFIG[approval.status] ?? STATUS_CONFIG.pending
  const slaDue = approval.slaDue ? new Date(approval.slaDue) : null
  const isOverdue = slaDue ? slaDue < new Date() : false
  const daysInQueue = approval.daysInQueue ?? 0

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:shadow-card-hover hover:border-primary/20',
        selected && 'ring-2 ring-primary',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {showCheckbox && onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-input"
            aria-label={`Select approval ${approval.id}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {approval.id?.slice(0, 8)}…
            </span>
            <Badge variant={config.variant}>{config.label}</Badge>
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {approval.customerName ?? '—'} · {approval.sampleLocation ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysInQueue}d in queue
            </span>
            {approval.testResults?.spc != null && (
              <span>SPC: {approval.testResults.spc}</span>
            )}
            {approval.testResults?.totalColiform != null && (
              <span>Coliform: {approval.testResults.totalColiform}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(approval.status === 'pending' || approval.status === 'under_review') &&
            onQuickAction && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onQuickAction('reject')}
                  aria-label="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onQuickAction('approve')}
                  aria-label="Approve"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          <Button
            size="sm"
            variant="ghost"
            asChild
          >
            <Link to={`/dashboard/approvals/${approval.id}`}>
              <FileEdit className="h-4 w-4 mr-1" />
              View
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
