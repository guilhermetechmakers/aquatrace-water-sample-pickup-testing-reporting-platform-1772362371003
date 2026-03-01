/**
 * Lab Technician Dashboard
 * Desktop-focused queue of samples awaiting lab testing
 * Sortable columns, filters, quick-entry panel, link to Lab Results Entry Page
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FlaskConical,
  Upload,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileEdit,
  Plus,
  Filter,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQueuedSamples } from '@/hooks/useLabResultsEntry'
import { useRBAC } from '@/hooks/useRBAC'
import { useSites } from '@/hooks/useSites'
import { format } from 'date-fns'
import type { LabSampleWithResult } from '@/api/lab-results-entry'

function SortableHeader({
  column,
  children,
}: {
  column: { getIsSorted: () => false | 'asc' | 'desc'; getToggleSortingHandler: () => ((e: unknown) => void) | undefined }
  children: React.ReactNode
}) {
  const sort = column.getIsSorted()
  const handler = column.getToggleSortingHandler()
  return (
    <button
      type="button"
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
      onClick={(e) => handler?.(e)}
    >
      {children}
      {sort === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : sort === 'desc' ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  )
}

function EntryStatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? 'not_entered'
  const variant =
    s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : s === 'pending' ? 'pending' : 'secondary'
  return <Badge variant={variant}>{s === 'not_entered' ? 'Not Entered' : s}</Badge>
}

export function LabTechnicianDashboardPage() {
  const navigate = useNavigate()
  const { hasPermission } = useRBAC()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [siteFilter, setSiteFilter] = useState<string>('')
  const [dueDateFrom, setDueDateFrom] = useState<string>('')
  const [dueDateTo, setDueDateTo] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'collectionDate', desc: true }])
  const [quickEntrySample, setQuickEntrySample] = useState<LabSampleWithResult | null>(null)

  const { data: sitesData } = useSites()
  const sites = sitesData ?? []

  const params = useMemo(() => ({
    status: statusFilter || undefined,
    siteId: siteFilter || undefined,
    dueDateFrom: dueDateFrom || undefined,
    dueDateTo: dueDateTo || undefined,
  }), [statusFilter, siteFilter, dueDateFrom, dueDateTo])

  const { data, isLoading } = useQueuedSamples(params)
  const samples = data?.data ?? []
  const count = data?.count ?? 0

  const filteredSamples = useMemo(() => {
    const list = Array.isArray(samples) ? samples : []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (s) =>
        s.id?.toLowerCase().includes(q) ||
        s.customerName?.toLowerCase().includes(q) ||
        s.siteName?.toLowerCase().includes(q)
    )
  }, [samples, search])

  const columns = useMemo<ColumnDef<LabSampleWithResult>[]>(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <SortableHeader column={column}>Sample ID</SortableHeader>,
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.id?.slice(0, 12)}…
          </span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
        cell: ({ row }) => row.original.customerName ?? '—',
      },
      {
        accessorKey: 'siteName',
        header: ({ column }) => <SortableHeader column={column}>Site</SortableHeader>,
        cell: ({ row }) => row.original.siteName ?? '—',
      },
      {
        accessorKey: 'collectionDate',
        header: ({ column }) => <SortableHeader column={column}>Collection Date</SortableHeader>,
        cell: ({ row }) => {
          const d = row.original.collectionDate
          return d ? format(new Date(d), 'MMM d, yyyy') : '—'
        },
      },
      {
        accessorKey: 'onSiteStatus',
        header: ({ column }) => <SortableHeader column={column}>On-site Status</SortableHeader>,
        cell: ({ row }) => row.original.onSiteStatus ?? '—',
      },
      {
        accessorKey: 'spcResult',
        header: ({ column }) => <SortableHeader column={column}>SPC Result</SortableHeader>,
        cell: ({ row }) => row.original.spcResult != null ? String(row.original.spcResult) : '—',
      },
      {
        accessorKey: 'coliformResult',
        header: ({ column }) => <SortableHeader column={column}>Coliform Result</SortableHeader>,
        cell: ({ row }) => row.original.coliformResult != null ? String(row.original.coliformResult) : '—',
      },
      {
        accessorKey: 'entryStatus',
        header: ({ column }) => <SortableHeader column={column}>Entry Status</SortableHeader>,
        cell: ({ row }) => <EntryStatusBadge status={row.original.entryStatus} />,
      },
      {
        accessorKey: 'lastModified',
        header: ({ column }) => <SortableHeader column={column}>Last Modified</SortableHeader>,
        cell: ({ row }) => {
          const d = row.original.lastModified
          return d ? format(new Date(d), 'MMM d, HH:mm') : '—'
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            {hasPermission('lab_results', 'create') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/dashboard/lab/entry/${row.original.id}`)}
                className="transition-transform hover:scale-105"
              >
                <FileEdit className="h-4 w-4 mr-1" />
                Enter
              </Button>
            )}
          </div>
        ),
      },
    ],
    [hasPermission, navigate]
  )

  const table = useReactTable({
    data: filteredSamples,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleQuickEntry = (sample: LabSampleWithResult) => {
    setQuickEntrySample(sample)
  }

  const handleOpenEntryPage = () => {
    if (quickEntrySample) {
      navigate(`/dashboard/lab/entry/${quickEntrySample.id}`)
      setQuickEntrySample(null)
    }
  }

  if (!hasPermission('lab_results', 'read') && !hasPermission('lab_results', 'create')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the lab queue.
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
          <h1 className="text-3xl font-bold tracking-tight">Lab Technician Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Samples queued for lab testing, SPC and Total Coliform results
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/lab/import">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <CardTitle>Sample Queue</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search samples..."
                    className="pl-9 w-48 sm:w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by entry status"
                  >
                    <option value="">All statuses</option>
                    <option value="not_entered">Not Entered</option>
                    <option value="pending">Pending</option>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={siteFilter}
                    onChange={(e) => setSiteFilter(e.target.value)}
                    aria-label="Filter by site"
                  >
                    <option value="">All sites</option>
                    {(sites ?? []).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={dueDateFrom}
                    onChange={(e) => setDueDateFrom(e.target.value)}
                    aria-label="Due date from"
                  />
                  <input
                    type="date"
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={dueDateTo}
                    onChange={(e) => setDueDateTo(e.target.value)}
                    aria-label="Due date to"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => (
                          <th
                            key={h.id}
                            className="px-4 py-3 text-left text-sm font-medium">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t transition-colors hover:bg-muted/30"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(filteredSamples ?? []).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No samples in queue</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Queue overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Queue</span>
              <span className="font-semibold">{count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Not Entered</span>
              <span className="font-semibold">
                {(samples ?? []).filter((s) => !s.resultId || s.entryStatus === 'not_entered').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-semibold">
                {(samples ?? []).filter((s) => s.entryStatus === 'pending').length}
              </span>
            </div>
            {hasPermission('lab_results', 'create') && (
              <Button
                className="w-full mt-4"
                onClick={() => {
                  const first = (samples ?? []).find((s) => !s.resultId || s.entryStatus === 'not_entered')
                  if (first) handleQuickEntry(first)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Entry
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(quickEntrySample)} onOpenChange={(o) => !o && setQuickEntrySample(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Entry</DialogTitle>
            <DialogDescription>
              Open Lab Results Entry for {quickEntrySample?.siteName ?? quickEntrySample?.id}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickEntrySample(null)}>
              Cancel
            </Button>
            <Button onClick={handleOpenEntryPage}>
              <FileEdit className="h-4 w-4 mr-2" />
              Open Entry Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
