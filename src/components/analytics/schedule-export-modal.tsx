/**
 * ScheduleExportModal - configure export type, format, filters
 */

import { useState } from 'react'
import { FileDown, Loader2, Calendar } from 'lucide-react'
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
import { useRequestExport, useScheduleExport } from '@/hooks/useAnalytics'

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
  const [schedule, setSchedule] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once')
  const requestExport = useRequestExport()
  const scheduleExport = useScheduleExport()

  const handleExport = () => {
    if (schedule === 'once') {
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
    } else {
      scheduleExport.mutate(
        {
          type,
          schedule: schedule as 'daily' | 'weekly' | 'monthly',
          filters,
        },
        {
          onSuccess: (r) => {
            toast.success(`Scheduled export created. ID: ${r.scheduleId}`)
            onOpenChange(false)
          },
          onError: (e) =>
            toast.error(e instanceof Error ? e.message : 'Schedule failed'),
        }
      )
    }
  }

  const isPending = requestExport.isPending || scheduleExport.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Generate a PDF or CSV export. Choose on-demand or schedule recurring exports.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </Label>
            <div className="flex flex-wrap gap-3 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="schedule" checked={schedule === 'once'} onChange={() => setSchedule('once')} className="rounded-full" />
                On-demand
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="schedule" checked={schedule === 'daily'} onChange={() => setSchedule('daily')} className="rounded-full" />
                Daily
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="schedule" checked={schedule === 'weekly'} onChange={() => setSchedule('weekly')} className="rounded-full" />
                Weekly
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="schedule" checked={schedule === 'monthly'} onChange={() => setSchedule('monthly')} className="rounded-full" />
                Monthly
              </label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : schedule === 'once' ? (
              `Export ${type.toUpperCase()}`
            ) : (
              `Schedule ${schedule}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
