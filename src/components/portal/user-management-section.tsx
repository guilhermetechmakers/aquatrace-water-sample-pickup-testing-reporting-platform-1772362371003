/**
 * UserManagementSection - Invite/manage users within customer org (for admins)
 */

import { useState } from 'react'
import { Users, UserPlus, Mail, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useInvitations, useCreateInvitation } from '@/hooks/usePortal'
import { useTenantData } from '@/hooks/usePortal'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface UserManagementSectionProps {
  /** Whether current user can manage users (e.g. customer org admin) */
  canManageUsers?: boolean
  className?: string
}

export function UserManagementSection({
  canManageUsers = false,
  className,
}: UserManagementSectionProps) {
  const { data: customerId } = useTenantData()
  const { data: invitations = [], isLoading } = useInvitations()
  const createInvitation = useCreateInvitation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'CUSTOMER_VIEW' | 'ADMIN'>('CUSTOMER_VIEW')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const safeInvitations = Array.isArray(invitations) ? invitations : []
  const pendingCount = safeInvitations.filter((i) => i.status === 'pending').length

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      toast.error('Please enter an email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address')
      return
    }
    try {
      const inv = await createInvitation.mutateAsync({
        customerId: customerId ?? null,
        email: trimmed,
        role,
      })
      if (inv) {
        toast.success(`Invitation sent to ${trimmed}`)
        setDialogOpen(false)
        setEmail('')
        setRole('CUSTOMER_VIEW')
      } else {
        toast.error('Failed to send invitation')
      }
    } catch {
      toast.error('Failed to send invitation')
    }
  }

  const handleCopyLink = (inv: { id: string; token: string; email: string }) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${base}/signup?invite=${inv.token}`
    navigator.clipboard.writeText(url).then(
      () => {
        setCopiedId(inv.id)
        toast.success('Invitation link copied')
        setTimeout(() => setCopiedId(null), 2000)
      },
      () => toast.error('Failed to copy link')
    )
  }

  if (!canManageUsers) return null

  return (
    <Card className={cn('transition-all hover:shadow-card-hover', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
            {pendingCount > 0 && (
              <Badge variant="pending" className="ml-1">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="transition-all hover:scale-[1.02]"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : safeInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invitations yet. Invite team members to give them access to reports.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {safeInvitations.slice(0, 5).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.role} · {format(new Date(inv.createdAt), 'PP')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      inv.status === 'pending'
                        ? 'pending'
                        : inv.status === 'accepted'
                          ? 'approved'
                          : 'outline'
                    }
                    className="shrink-0"
                  >
                    {inv.status}
                  </Badge>
                </div>
                {inv.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyLink(inv)}
                    aria-label="Copy invitation link"
                  >
                    {copiedId === inv.id ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to give someone access to your organization&apos;s reports and invoices.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'CUSTOMER_VIEW' | 'ADMIN')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="CUSTOMER_VIEW">Viewer (reports only)</option>
                <option value="ADMIN">Admin (can invite others)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvitation.isPending}>
                {createInvitation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
