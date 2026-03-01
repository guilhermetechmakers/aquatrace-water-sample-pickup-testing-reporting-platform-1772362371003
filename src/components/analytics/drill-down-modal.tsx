/**
 * DrillDownModal - Detailed view for KPI or alert
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SLAAlert } from '@/types/analytics'
import { format } from 'date-fns'

export interface DrillDownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  alert?: SLAAlert | null
  children?: React.ReactNode
}

export function DrillDownModal({
  open,
  onOpenChange,
  title = 'Details',
  description,
  alert,
  children,
}: DrillDownModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
        {alert && !children && (
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Workflow stage
              </p>
              <p className="text-sm">{alert.workflowStage.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Breach time
              </p>
              <p className="text-sm">
                {format(new Date(alert.breachTime), 'PPpp')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Severity
              </p>
              <p className="text-sm capitalize">{alert.severity}</p>
            </div>
            {alert.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm">{alert.notes}</p>
              </div>
            )}
            {Array.isArray(alert.affectedOrderIds) &&
              alert.affectedOrderIds.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Affected orders
                  </p>
                  <p className="text-sm font-mono">
                    {alert.affectedOrderIds.join(', ')}
                  </p>
                </div>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
