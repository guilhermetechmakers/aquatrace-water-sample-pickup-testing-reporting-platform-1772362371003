/**
 * SupportRequestDialog - Create support ticket from portal
 */

import { useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateSupportTicket } from '@/hooks/usePortal'
import { toast } from 'sonner'

export interface SupportRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportId?: string | null
  reportDisplayId?: string
}

export function SupportRequestDialog({
  open,
  onOpenChange,
  reportId,
  reportDisplayId,
}: SupportRequestDialogProps) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  const createTicket = useCreateSupportTicket()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const subj = subject.trim()
    if (!subj) {
      toast.error('Please enter a subject')
      return
    }
    try {
      const ticket = await createTicket.mutateAsync({
        subject: subj,
        description: description.trim() || undefined,
        reportId: reportId ?? null,
      })
      if (ticket) {
        toast.success('Support request submitted. We will respond shortly.')
        onOpenChange(false)
        setSubject('')
        setDescription('')
      } else {
        toast.error('Failed to submit support request')
      }
    } catch {
      toast.error('Failed to submit support request')
    }
  }

  const handleClose = () => {
    setSubject('')
    setDescription('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Contact Support
          </DialogTitle>
          <DialogDescription>
            Submit a support request. Our team will review and respond as soon as possible.
            {reportDisplayId && (
              <span className="block mt-1">
                This request will be linked to report {reportDisplayId}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-subject">Subject *</Label>
            <Input
              id="support-subject"
              placeholder="Brief description of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-description">Description (optional)</Label>
            <textarea
              id="support-description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Provide additional details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? (
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
