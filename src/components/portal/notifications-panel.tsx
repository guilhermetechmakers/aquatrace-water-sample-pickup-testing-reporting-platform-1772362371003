/**
 * NotificationsPanel - Real-time or polling notifications
 */

import { Link } from 'react-router-dom'
import { FileText, Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications, useMarkNotificationRead } from '@/hooks/usePortal'
import { cn } from '@/lib/utils'

export interface NotificationsPanelProps {
  onClose?: () => void
  className?: string
}

export function NotificationsPanel({ onClose, className }: NotificationsPanelProps) {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const safeNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = safeNotifications.filter((n) => !n.readAt).length

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  return (
    <div
      className={cn(
        'w-80 rounded-lg border bg-card shadow-lg overflow-hidden',
        className
      )}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : safeNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              New reports and updates will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {safeNotifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'px-4 py-3 transition-colors hover:bg-muted/50',
                  !n.readAt && 'bg-primary/5'
                )}
              >
                <Link
                  to={n.link ?? '/portal'}
                  className="block"
                  onClick={() => {
                    if (!n.readAt) handleMarkRead(n.id)
                    onClose?.()
                  }}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
