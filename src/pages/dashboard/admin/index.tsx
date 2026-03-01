import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Shield,
  Users,
  FileText,
  ChevronRight,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRBAC } from '@/hooks/useRBAC'
import { fetchRoles } from '@/api/roles'
import { getPermissionsForRole } from '@/lib/rbac-permissions'
import { AUTH_ROLES, ROLE_LABELS } from '@/types/auth'
import type { AuthRole } from '@/types/auth'

const RESOURCES = ['pickup', 'lab_results', 'reports', 'admin_ui', 'users', 'roles', 'audit', 'customers'] as const
const ACTIONS = ['read', 'create', 'update', 'delete', 'execute'] as const

function PermissionMatrix() {
  const { hasPermission } = useRBAC()
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  })

  if (!hasPermission('admin_ui', 'read')) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const roleList = (roles ?? []) as { id: string; name: string; description?: string }[]
  const matrixRoles = roleList.length > 0 ? roleList : AUTH_ROLES.map((r) => ({ id: r, name: r, description: '' }))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Role-Permission Matrix
        </CardTitle>
        <CardDescription>
          View permissions by role. Admin can edit roles and permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">Role</th>
                {RESOURCES.map((res) =>
                  ACTIONS.map((act) => (
                    <th key={`${res}-${act}`} className="h-12 px-2 text-center align-middle font-medium min-w-[4rem]">
                      {res}
                      <br />
                      <span className="text-xs text-muted-foreground">{act}</span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {matrixRoles.map((role) => {
                const perms = getPermissionsForRole((role.name ?? role.id) as AuthRole)
                const permSet = new Set(perms.map((p) => `${p.resource}:${p.action}`))
                return (
                  <tr key={role.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="p-4 font-medium">
                      {ROLE_LABELS[(role.name ?? role.id) as AuthRole] ?? role.name}
                    </td>
                    {RESOURCES.map((res) =>
                      ACTIONS.map((act) => (
                        <td key={`${res}-${act}`} className="p-2 text-center">
                          {permSet.has(`${res}:${act}`) ? (
                            <Check className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
  const { hasPermission } = useRBAC()

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the Admin Console.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="text-muted-foreground mt-1">
          Manage roles, permissions, users, and audit logs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/dashboard/admin/users">
          <Card className="h-full transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <Users className="h-10 w-10 text-primary" />
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">User Management</CardTitle>
              <CardDescription>
                Invite users, assign roles, suspend or reactivate accounts
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
        <Link to="/dashboard/admin/audit">
          <Card className="h-full transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <FileText className="h-10 w-10 text-primary" />
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Audit Logs</CardTitle>
              <CardDescription>
                Review role changes and access events
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      <PermissionMatrix />
    </div>
  )
}
