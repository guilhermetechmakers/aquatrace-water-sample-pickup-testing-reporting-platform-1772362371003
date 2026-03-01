/**
 * Audit Viewer Page
 * Admin UI to search, filter, sort, paginate audit entries.
 * Export CSV/JSON, expandable detail pane for metadata and hash/signature.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  FileCheck,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRBAC } from '@/hooks/useRBAC'
import { useAuditLogs, useAuditSummary, useExportAuditLogs } from '@/hooks/useAudit'
import { format, subDays } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AuditEntry, AuditLogFilters } from '@/types/audit'

const ACTION_TYPES = [
  'READ', 'WRITE', 'APPROVE', 'REJECT', 'DOWNLOAD', 'SIGN_OFF', 'EXPORT', 'DISTRIBUTE', 'CREATE', 'UPDATE', 'DELETE',
] as const

const RESOURCE_TYPES = [
  'TEST_RESULT', 'REPORT', 'PDF', 'CUSTOMER_RECORD', 'PICKUP', 'APPROVAL', 'INVOICE',
] as const

function DetailPane({ entry }: { entry: AuditEntry }) {
  const meta = entry.metadata ?? {}
  const metaKeys = Object.keys(meta)
  return (
    <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <span className="font-medium text-muted-foreground">Hash</span>
          <p className="font-mono text-xs break-all mt-0.5">{entry.hash}</p>
        </div>
        {entry.previous_hash && (
          <div>
            <span className="font-medium text-muted-foreground">Previous Hash</span>
            <p className="font-mono text-xs break-all mt-0.5">{entry.previous_hash}</p>
          </div>
        )}
        {entry.signature && (
          <div className="sm:col-span-2">
            <span className="font-medium text-muted-foreground">Signature</span>
            <p className="font-mono text-xs break-all mt-0.5">{entry.signature}</p>
          </div>
        )}
      </div>
      {metaKeys.length > 0 && (
        <div>
          <span className="font-medium text-muted-foreground">Metadata</span>
          <pre className="mt-1 p-2 rounded bg-background overflow-auto text-xs max-h-32">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function AdminAuditPage() {
  const { hasPermission } = useRBAC()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditLogFilters>(() => ({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    page: 1,
    pageSize: 20,
  }))

  const debouncedSearch = useMemo(() => filters.q ?? '', [filters.q])
  const effectiveFilters = useMemo(
    () => ({ ...filters, q: debouncedSearch }),
    [filters, debouncedSearch]
  )

  const { data, isLoading } = useAuditLogs(effectiveFilters)
  const { data: summary } = useAuditSummary({
    from: filters.from,
    to: filters.to,
  })
  const exportMutation = useExportAuditLogs()

  const entries = data?.data ?? []
  const total = data?.total ?? 0
  const page = data?.page ?? 1
  const pageSize = data?.pageSize ?? 20
  const totalPages = Math.ceil(total / pageSize)

  const handleFilterChange = useCallback((key: keyof AuditLogFilters, value: string | number | string[] | undefined) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'page' || key === 'pageSize') return next
      return { ...next, page: 1 }
    })
  }, [])

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      try {
        const result = await exportMutation.mutateAsync({
          from: filters.from,
          to: filters.to,
          userId: filters.userId,
          actionTypes: filters.actionTypes,
          resourceTypes: filters.resourceTypes,
          q: filters.q,
          format,
        })
        const blob = new Blob([result.content], {
          type: format === 'json' ? 'application/json' : 'text/csv',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported as ${format.toUpperCase()}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Export failed')
      }
    },
    [filters, exportMutation]
  )

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
            <p className="text-muted-foreground mt-1">
              Immutable log of all critical actions across AquaTrace
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-1.5 hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 shrink-0" />
            )}
            <span className="ml-1.5 hidden sm:inline">JSON</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-base">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.byActionType?.APPROVE ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign-offs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.byActionType?.SIGN_OFF ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.byActionType?.EXPORT ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="audit-from">From</Label>
                <Input
                  id="audit-from"
                  type="date"
                  value={filters.from ?? ''}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="audit-to">To</Label>
                <Input
                  id="audit-to"
                  type="date"
                  value={filters.to ?? ''}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="audit-action">Action Type</Label>
                <Select
                  value={filters.actionTypes?.[0] ?? 'all'}
                  onValueChange={(v) =>
                    handleFilterChange('actionTypes', v === 'all' ? undefined : [v])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="audit-resource">Resource Type</Label>
                <Select
                  value={filters.resourceTypes?.[0] ?? 'all'}
                  onValueChange={(v) =>
                    handleFilterChange('resourceTypes', v === 'all' ? undefined : [v])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {RESOURCE_TYPES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <Label htmlFor="audit-search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="audit-search"
                    placeholder="User, resource, action..."
                    value={filters.q ?? ''}
                    onChange={(e) => handleFilterChange('q', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
          <CardTitle className="flex items-center gap-2 mt-4">
            <FileCheck className="h-5 w-5 text-primary" />
            Audit Entries
          </CardTitle>
          <CardDescription>
            {total} entries · Page {page} of {totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-8" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(entries ?? []).map((entry: AuditEntry) => (
                    <React.Fragment key={entry.id}>
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() =>
                          setExpandedId((prev) => (prev === entry.id ? null : entry.id))
                        }
                      >
                        <TableCell className="w-8">
                          {expandedId === entry.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {entry.timestamp ? format(new Date(entry.timestamp), 'PPp') : '—'}
                        </TableCell>
                        <TableCell>
                          {entry.user_name ?? entry.user_id?.slice(0, 8) ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded px-2 py-0.5 text-xs font-medium',
                              entry.action_type === 'APPROVE' && 'bg-success/20 text-success',
                              entry.action_type === 'REJECT' && 'bg-destructive/20 text-destructive',
                              entry.action_type === 'SIGN_OFF' && 'bg-primary/20 text-primary',
                              !['APPROVE', 'REJECT', 'SIGN_OFF'].includes(entry.action_type ?? '') &&
                                'bg-muted text-muted-foreground'
                            )}
                          >
                            {entry.action_type}
                          </span>
                        </TableCell>
                        <TableCell>{entry.resource_type}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.resource_id?.slice(0, 12) ?? '—'}…
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-muted-foreground">
                          {Object.keys(entry.metadata ?? {}).length > 0
                            ? `${Object.keys(entry.metadata ?? {}).length} keys`
                            : '—'}
                        </TableCell>
                      </TableRow>
                      {expandedId === entry.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/20 p-4">
                            <DetailPane entry={entry} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {(entries ?? []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit entries found</p>
                  <p className="text-sm mt-1">
                    Audit entries are created when approvals, sign-offs, exports, and other critical actions occur.
                  </p>
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handleFilterChange('page', page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handleFilterChange('page', page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
