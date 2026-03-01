/**
 * ReissueRequestModal - Submit reissue request for a report
 */

import { useState } from 'react'
import { FileText, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRequestReissue } from '@/hooks/usePortal'
import { toast } from 'sonner'

export interface ReissueRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportId: string
  reportDisplayId?: string
}

export function ReissueRequestModal({
  open,
  onOpenChange,
  reportId,
  reportDisplayId,
}: ReissueRequestModalProps) {
  const [reason, setReason] = useState('')

  const requestReissue = useRequestReissue()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await requestReissue.mutateAsync({ reportId, reason: reason.trim() || undefined })
      if (result.success) {
        toast.success(result.message ?? 'Reissue request submitted')
        onOpenChange(false)
        setReason('')
      } else {
        toast.error(result.message ?? 'Failed to submit request')
      }
    } catch {
      toast.error('Failed to submit reissue request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Request Report Reissue
          </DialogTitle>
          <DialogDescription>
            Submit a request to have report {reportDisplayId ?? reportId} reissued. Our team will
            review and process your request. You will be notified when the new version is ready.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reissue-reason">Reason (optional)</Label>
            <textarea
              id="reissue-reason"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Describe why you need a reissue (e.g., corrections, updated data)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={requestReissue.isPending}>
              {requestReissue.isPending ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
