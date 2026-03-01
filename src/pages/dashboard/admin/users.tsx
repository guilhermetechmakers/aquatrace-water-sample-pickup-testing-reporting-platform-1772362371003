import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Users,
  Plus,
  MoreHorizontal,
  RefreshCw,
  UserX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import { fetchUsers, inviteUser, type ProfileUser } from '@/api/users'
import { fetchRoles } from '@/api/roles'
import { AUTH_ROLES, ROLE_LABELS } from '@/types/auth'
import type { AuthRole } from '@/types/auth'

export function AdminUsersPage() {
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState<string>('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  })

  useEffect(() => {
    if (roles.length > 0 && !inviteRoleId) {
      setInviteRoleId((roles[0] as { id: string }).id)
    }
  }, [roles, inviteRoleId])

  const roleName = (roles as { id: string; name: string }[]).find((r) => r.id === inviteRoleId)?.name ?? 'TECHNICIAN'
  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteUser(inviteEmail, inviteName, roleName, user?.id ?? ''),
    onSuccess: () => {
      toast.success('Invitation sent successfully')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRoleId('')
      inviteMutation.reset()
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation')
    },
  })

  const handleInvite = () => {
    if (!inviteEmail || !inviteName) {
      toast.error('Email and name are required')
      return
    }
    inviteMutation.mutate()
  }

  if (!hasPermission('users', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to manage users.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Invite users, assign roles, and manage accounts
          </p>
        </div>
        {hasPermission('users', 'create') && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invitation email. The user will receive onboarding steps.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full name</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRoleId || (roles[0] as { id: string })?.id}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {(roles as { id: string; name: string }[]).map((r) => (
                      <option key={r.id} value={r.id}>
                        {ROLE_LABELS[(r.name ?? r.id) as AuthRole] ?? r.name}
                      </option>
                    ))}
                    {roles.length === 0 &&
                      AUTH_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
          <CardDescription>
            {(users as ProfileUser[]).length} users · Last login and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">User</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(users ?? []).map((u: ProfileUser) => (
                    <tr key={u.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{u.display_name || u.email}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          {ROLE_LABELS[u.role as AuthRole] ?? u.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.status === 'active' ? 'success' : 'pending'}>
                          {u.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {hasPermission('users', 'update') && u.id !== user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend invite
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {(Array.isArray(users) ? users : []).length} users
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
