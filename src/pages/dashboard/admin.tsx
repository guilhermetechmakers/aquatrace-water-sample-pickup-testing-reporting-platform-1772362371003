import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  Users,
  FileText,
  Plus,
  Mail,
  Check,
  X,
  Download,
  FileDown,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGuard } from '@/components/auth/permission-guard'
import * as rbacApi from '@/api/rbac'
import * as usersApi from '@/api/users'
import { AUTH_ROLES, ROLE_LABELS } from '@/types/auth'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const RESOURCES = [
  'pickup',
  'lab_results',
  'lab_queue',
  'reports',
  'approvals',
  'admin_ui',
  'roles',
  'users',
  'audit',
  'technician_dashboard',
  'customer_portal',
] as const

const ACTIONS = ['read', 'create', 'update', 'delete', 'execute'] as const

export function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const defaultTab = useMemo(() => {
    if (location.pathname.includes('/users')) return 'users'
    if (location.pathname.includes('/audit')) return 'audit'
    return 'roles'
  }, [location.pathname])

  const handleTabChange = (v: string) => {
    if (v === 'users') navigate('/dashboard/users')
    else if (v === 'audit') navigate('/dashboard/audit')
    else navigate('/dashboard/admin')
  }
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('TECHNICIAN')
  const [inviteName, setInviteName] = useState('')
  const [auditFilterFrom, setAuditFilterFrom] = useState('')
  const [auditFilterTo, setAuditFilterTo] = useState('')
  const [auditFilterReason, setAuditFilterReason] = useState('')

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac', 'roles'],
    queryFn: rbacApi.fetchRoles,
  })

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: () => rbacApi.fetchPermissions(),
  })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['rbac', 'users'],
    queryFn: usersApi.fetchProfiles,
  })

  const { data: roleAudit = [], isLoading: auditLoading } = useQuery({
    queryKey: ['rbac', 'audit'],
    queryFn: () => rbacApi.fetchRoleChangesAudit(100),
  })

  const inviteMutation = useMutation({
    mutationFn: (params: { email: string; role: string; displayName?: string }) =>
      usersApi.inviteUser(params),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('Invitation sent')
        setInviteOpen(false)
        setInviteEmail('')
        setInviteName('')
        queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] })
      } else {
        toast.error(res.message)
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Invite failed'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      usersApi.updateProfileRole(userId, role),
    onSuccess: () => {
      toast.success('Role updated')
      queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      usersApi.updateProfileStatus(userId, status),
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries({ queryKey: ['rbac', 'users'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      displayName: inviteName.trim() || undefined,
    })
  }

  const getPermForRole = (roleName: string, resource: string, action: string) =>
    (permissions ?? []).some(
      (p) => p.role_id === (roles ?? []).find((r) => r.name === roleName)?.id && p.resource === resource && p.action === action
    )

  const filteredAudit = (roleAudit ?? []).filter((a) => {
    if (auditFilterFrom && (a.from_role ?? '').toLowerCase().indexOf(auditFilterFrom.toLowerCase()) < 0) return false
    if (auditFilterTo && (a.to_role ?? '').toLowerCase().indexOf(auditFilterTo.toLowerCase()) < 0) return false
    if (auditFilterReason && (a.reason ?? '').toLowerCase().indexOf(auditFilterReason.toLowerCase()) < 0) return false
    return true
  })

  const exportAuditCsv = () => {
    const headers = ['Timestamp', 'Action', 'From Role', 'To Role', 'Reason']
    const rows = filteredAudit.map((a) => [
      format(new Date(a.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Role change',
      a.from_role ?? '',
      a.to_role ?? '',
      (a.reason ?? '').replace(/"/g, '""'),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const exportAuditPdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Popup blocked — allow popups to export PDF')
      return
    }
    const rows = filteredAudit
      .map(
        (a) =>
          `<tr><td>${format(new Date(a.created_at), 'PPp')}</td><td>Role change</td><td>${a.from_role ?? '—'}</td><td>${a.to_role}</td><td>${a.reason ?? '—'}</td></tr>`
      )
      .join('')
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Audit Log</title>
      <style>body{font-family:Inter,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
      </head><body><h1>AquaTrace Audit Log</h1><p>Exported ${format(new Date(), 'PPp')}</p>
      <table><thead><tr><th>Timestamp</th><th>Action</th><th>From Role</th><th>To Role</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
    toast.success('Print dialog opened — use Save as PDF')
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground mt-1">
            Manage roles, permissions, and user invitations
          </p>
        </div>
      </div>

      <Tabs value={defaultTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>
                Read/write/delete/create/execute for each capability by role
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading || permsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-medium">Resource</th>
                        {AUTH_ROLES.map((r) => (
                          <th key={r} className="text-center p-3 font-medium">{(ROLE_LABELS as Record<string, string>)[r] ?? r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RESOURCES.map((resource) => (
                        <tr key={resource} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{resource}</td>
                          {AUTH_ROLES.map((role) => (
                            <td key={role} className="p-3 text-center">
                              <div className="flex flex-wrap justify-center gap-1">
                                {ACTIONS.map((action) => {
                                  const has = getPermForRole(role, resource, action)
                                  return (
                                    <span
                                      key={action}
                                      className={cn(
                                        'rounded px-1.5 py-0.5 text-xs',
                                        has ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                      )}
                                    >
                                      {action[0]}
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    List users with roles, status, last login; change role, suspend, resend invite
                  </CardDescription>
                </div>
                <PermissionGuard resource="users" action="update">
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
                          Send an email invitation with onboarding steps. Role will be assigned on signup.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="invite-email">Email</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            placeholder="user@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="invite-name">Display Name (optional)</Label>
                          <Input
                            id="invite-name"
                            placeholder="John Doe"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="invite-role">Role</Label>
                          <select
                            id="invite-role"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                          >
                            {AUTH_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {(ROLE_LABELS as Record<string, string>)[r] ?? r}
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
                          {inviteMutation.isPending ? (
                            <>Sending...</>
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Invite
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </PermissionGuard>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
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
                        <th className="h-12 px-4 text-left align-middle font-medium">Last Login</th>
                        <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users ?? []).map((u) => (
                        <tr key={u.id} className="border-b transition-colors hover:bg-muted/30">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{u.display_name || u.email}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">{(ROLE_LABELS as Record<string, string>)[u.role] ?? u.role}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                u.status === 'active' ? 'success' : u.status === 'suspended' ? 'destructive' : 'pending'
                              }
                            >
                              {u.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {u.last_login ? format(new Date(u.last_login), 'PPp') : '—'}
                          </td>
                          <td className="p-4 text-right">
                            <PermissionGuard resource="users" action="update">
                              <div className="flex gap-2 justify-end">
                                <select
                                  className="rounded border border-input bg-background px-2 py-1 text-xs"
                                  value={u.role}
                                  onChange={(e) =>
                                    updateRoleMutation.mutate({ userId: u.id, role: e.target.value })
                                  }
                                >
                                  {AUTH_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {(ROLE_LABELS as Record<string, string>)[r] ?? r}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      userId: u.id,
                                      status: u.status === 'suspended' ? 'active' : 'suspended',
                                    })
                                  }
                                >
                                  {u.status === 'suspended' ? (
                                    <Check className="h-4 w-4 text-success" />
                                  ) : (
                                    <X className="h-4 w-4 text-destructive" />
                                  )}
                                </Button>
                              </div>
                            </PermissionGuard>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(users ?? []).length === 0 && !usersLoading && (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <CardTitle>Permissions Audit Log</CardTitle>
                  <CardDescription>
                    Role changes, access events. Filter by from/to role, reason.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportAuditCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAuditPdf}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter from role..."
                    className="pl-8 w-40"
                    value={auditFilterFrom}
                    onChange={(e) => setAuditFilterFrom(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter to role..."
                    className="pl-8 w-40"
                    value={auditFilterTo}
                    onChange={(e) => setAuditFilterTo(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Filter reason..."
                  className="w-48"
                  value={auditFilterReason}
                  onChange={(e) => setAuditFilterReason(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Timestamp</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Action</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">From → To</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filteredAudit ?? []).map((a) => (
                        <tr key={a.id} className="border-b transition-colors hover:bg-muted/30">
                          <td className="p-4 text-sm text-muted-foreground">
                            {format(new Date(a.created_at), 'PPp')}
                          </td>
                          <td className="p-4 font-medium">Role change</td>
                          <td className="p-4">
                            <span className="text-muted-foreground">{a.from_role ?? '—'}</span>
                            <span className="mx-2">→</span>
                            <span>{a.to_role}</span>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">{a.reason ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(filteredAudit ?? []).length === 0 && !auditLoading && (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit events {auditFilterFrom || auditFilterTo || auditFilterReason ? 'match filters' : 'yet'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
