import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRBAC } from '@/hooks/useRBAC'
import { fetchRoleChangeAudits, fetchAuditLogs } from '@/api/audit'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function AdminAuditPage() {
  const { hasPermission } = useRBAC()
  const [tab, setTab] = useState<'role-changes' | 'access'>('role-changes')
  const [filter, setFilter] = useState('')

  const { data: roleChanges = [], isLoading } = useQuery({
    queryKey: ['audit', 'role-changes'],
    queryFn: () => fetchRoleChangeAudits({ limit: 50 }),
  })

  const { data: accessLogs = [] } = useQuery({
    queryKey: ['audit', 'access'],
    queryFn: () => fetchAuditLogs({ limit: 50 }),
    enabled: tab === 'access',
  })

  const filteredRoleChanges = (roleChanges ?? []).filter(
    (r) =>
      !filter ||
      (r.from_role ?? '').toLowerCase().includes(filter.toLowerCase()) ||
      (r.to_role ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  const handleExport = () => {
    const data = tab === 'role-changes' ? filteredRoleChanges : accessLogs
    const csv = [
      Object.keys(data[0] ?? {}).join(','),
      ...(data ?? []).map((r) => Object.values(r).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${tab}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!hasPermission('audit', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view audit logs.
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
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            Role changes and access events
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('role-changes')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'role-changes'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                Role Changes
              </button>
              <button
                type="button"
                onClick={() => setTab('access')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === 'access'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted'
                )}
              >
                Access Events
              </button>
            </div>
            {tab === 'role-changes' && (
              <div className="relative flex-1 max-w-xs">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by role..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>
          <CardTitle className="flex items-center gap-2 mt-4">
            <FileText className="h-5 w-5" />
            {tab === 'role-changes' ? 'Role Change History' : 'Access Events'}
          </CardTitle>
          <CardDescription>
            {tab === 'role-changes'
              ? `${filteredRoleChanges.length} role change events`
              : `${(accessLogs ?? []).length} access events`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tab === 'role-changes' ? (
            isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(filteredRoleChanges ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {r.from_role} → {r.to_role}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Target user: {r.target_user_id?.slice(0, 8)}...
                        {r.reason && ` · ${r.reason}`}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {format(new Date(r.created_at), 'PPp')}
                    </span>
                  </div>
                ))}
                {filteredRoleChanges.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No role change events yet</p>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-4">
              {(accessLogs ?? []).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-medium">{r.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.target_type}
                      {r.target_id && ` · ${r.target_id}`}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {format(new Date(r.timestamp), 'PPp')}
                  </span>
                </div>
              ))}
              {(accessLogs ?? []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No access events yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
