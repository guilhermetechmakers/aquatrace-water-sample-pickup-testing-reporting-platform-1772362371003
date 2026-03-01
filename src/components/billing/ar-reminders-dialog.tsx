/**
 * ARRemindersDialog - Schedule reminders for overdue invoices
 */

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface ARRemindersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSchedule?: (cadence: string) => void
}

export function ARRemindersDialog({
  open,
  onOpenChange,
  onSchedule,
}: ARRemindersDialogProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const cadence = (form.elements.namedItem('cadence') as HTMLInputElement)?.value ?? '7,14,30'
    onSchedule?.(cadence)
    onOpenChange(false)
    toast.success('Reminder schedule updated. Reminders will be sent at configured intervals.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Schedule AR Reminders
          </DialogTitle>
          <DialogDescription>
            Configure when to send automated reminders for overdue invoices. Enter comma-separated days after due date (e.g. 7,14,30).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cadence">Reminder cadence (days)</Label>
            <Input
              id="cadence"
              name="cadence"
              placeholder="7,14,30"
              defaultValue="7,14,30"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Reminders will be sent at 7, 14, and 30 days after due date
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save & Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
