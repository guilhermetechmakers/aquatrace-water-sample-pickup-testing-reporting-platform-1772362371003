/**
 * ScheduleExportModal - configure export type, format, filters
 */

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { AnalyticsFilters } from '@/types/analytics'
import { useRequestExport } from '@/hooks/useAnalytics'

export interface ScheduleExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters?: AnalyticsFilters
}

export function ScheduleExportModal({
  open,
  onOpenChange,
  filters,
}: ScheduleExportModalProps) {
  const [type, setType] = useState<'pdf' | 'csv'>('csv')
  const requestExport = useRequestExport()

  const handleExport = () => {
    requestExport.mutate(
      { type, filters },
      {
        onSuccess: (r) => {
          toast.success(`Export job created. Job ID: ${r.jobId}`)
          onOpenChange(false)
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : 'Export failed'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Generate a PDF or CSV export for the selected date range and filters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Format</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export-type"
                  checked={type === 'csv'}
                  onChange={() => setType('csv')}
                  className="rounded-full"
                />
                CSV
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export-type"
                  checked={type === 'pdf'}
                  onChange={() => setType('pdf')}
                  className="rounded-full"
                />
                PDF
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={requestExport.isPending}
          >
            {requestExport.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Export ${type.toUpperCase()}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
