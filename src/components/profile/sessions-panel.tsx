import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/useProfile'
import { Monitor, MapPin, Clock, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Session } from '@/types/profile'

function formatLastActive(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Unknown'
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

interface SessionRowProps {
  session: Session
  onRevoke: (id: string) => void
  isRevoking: boolean
}

function SessionRow({ session, onRevoke, isRevoking }: SessionRowProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-border p-4 transition-all sm:flex-row sm:items-center sm:justify-between',
          session.isCurrent && 'border-primary/50 bg-primary/5'
        )}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{session.device ?? 'Unknown device'}</span>
            {session.isCurrent && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Current
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {session.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatLastActive(session.lastActive)}
            </span>
          </div>
        </div>
        {!session.isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isRevoking}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Revoke
          </Button>
        )}
      </div>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out this device. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRevoke(session.id)
                setShowConfirm(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function SessionsPanel() {
  const { data, isLoading, error } = useSessions()
  const revokeSession = useRevokeSession()
  const revokeAll = useRevokeAllSessions()
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false)

  const sessions = data?.sessions ?? []
  const currentSession = sessions.find((s) => s.isCurrent)
  const otherSessions = sessions.filter((s) => !s.isCurrent)
  const hasOtherSessions = otherSessions.length > 0

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="animate-fade-in border-destructive/50">
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Unable to load sessions. Please try again later.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your active sessions. Revoking a session will sign out that device.
            </CardDescription>
          </div>
          {hasOtherSessions && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeAllConfirm(true)}
              disabled={revokeAll.isPending}
            >
              Revoke all others
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <p className="text-sm text-muted-foreground">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(sessions ?? []).map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onRevoke={(id) => revokeSession.mutate(id)}
                  isRevoking={revokeSession.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={showRevokeAllConfirm} onOpenChange={setShowRevokeAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out all other devices. You will remain signed in on this device. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                revokeAll.mutate(currentSession?.id)
                setShowRevokeAllConfirm(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
