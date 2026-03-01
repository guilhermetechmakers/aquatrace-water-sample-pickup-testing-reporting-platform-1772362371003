/**
 * CommentThread - Manager comment history and composer
 */

import { useState } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { ApprovalComment } from '@/types/approvals'

export interface CommentThreadProps {
  comments: ApprovalComment[]
  onAddComment: (message: string) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function CommentThread({
  comments,
  onAddComment,
  isLoading = false,
  className,
}: CommentThreadProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const safeComments = Array.isArray(comments) ? comments : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onAddComment(trimmed)
      setMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Comment History</h3>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {safeComments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No comments yet.</p>
        ) : (
          safeComments.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-muted/30 p-3 animate-fade-in"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {c.by?.slice(0, 8) ?? '—'} {c.role ? `· ${c.role}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.createdAt ? format(new Date(c.createdAt), 'MMM d, HH:mm') : '—'}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{c.message}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a comment..."
          disabled={isLoading || submitting}
          className="flex-1"
          aria-label="Comment message"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!message.trim() || isLoading || submitting}
          className="shrink-0"
        >
          {submitting ? (
            <span className="animate-pulse">Sending…</span>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              Send
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
