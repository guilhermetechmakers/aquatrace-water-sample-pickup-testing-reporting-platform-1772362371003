/**
 * Lab Manager Dashboard (page_012) - Approval Queue
 * Pending/completed tests, batch actions, quick-sign, filters, SLA status
 */

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
  XCircle,
  AlertTriangle,
  Loader2,
  Wrench,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchLabManagers } from '@/api/users'
import type { ProfileUser } from '@/api/users'
import {
  usePendingApprovals,
  useApproveApproval,
  useRejectApproval,
  useBatchApprovalAction,
} from '@/hooks/useApprovals'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import { format } from 'date-fns'
import type { ApprovalRequest } from '@/types/approvals'
import { cn } from '@/lib/utils'

function SortableHeader({
  column,
  children,
  sortLabel,
}: {
  column: { getIsSorted: () => false | 'asc' | 'desc'; getToggleSortingHandler: () => ((e: unknown) => void) | undefined }
  children: React.ReactNode
  sortLabel: string
}) {
  const sort = column.getIsSorted()
  const handler = column.getToggleSortingHandler()
  const sortState = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
  return (
    <button
      type="button"
      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      onClick={(e) => handler?.(e)}
      aria-label={`Sort by ${sortLabel} (${sortState})`}
    >
      {children}
      {sort === 'asc' ? (
        <ChevronUp className="h-4 w-4" aria-hidden />
      ) : sort === 'desc' ? (
        <ChevronDown className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden />
      )}
    </button>
  )
}

const STATUS_LABELS: Record<ApprovalRequest['status'], string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  corrective_action: 'Corrective Action',
}

export function LabManagerDashboardPage() {
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchModal, setBatchModal] = useState<'approve' | 'reject' | 'corrective' | 'reassign' | null>(null)
  const [batchNotes, setBatchNotes] = useState('')
  const [correctiveDescription, setCorrectiveDescription] = useState('')
  const [correctiveDueDate, setCorrectiveDueDate] = useState('')
  const [correctiveAssignee, setCorrectiveAssignee] = useState('')
  const [reassignUserId, setReassignUserId] = useState('')
  const [reassignMessage, setReassignMessage] = useState('')
  const [labManagers, setLabManagers] = useState<ProfileUser[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])

  useEffect(() => {
    fetchLabManagers()
      .then((list) => setLabManagers(Array.isArray(list) ? list : []))
      .catch(() => setLabManagers([]))
  }, [])

  const filters = useMemo(
    () => ({
      status: (statusFilter && statusFilter !== 'all' ? statusFilter : undefined) as ApprovalRequest['status'] | undefined,
    }),
    [statusFilter]
  )

  const { data, isLoading, isError, error, refetch } = usePendingApprovals(filters)
  const approvals = data?.data ?? []
  const count = data?.count ?? 0
  const summary = data?.summary ?? { inQueue: 0, overdue: 0 }

  const approveMutation = useApproveApproval()
  const rejectMutation = useRejectApproval()
  const batchMutation = useBatchApprovalAction()

  const filteredApprovals = useMemo(() => {
    const list = Array.isArray(approvals) ? approvals : []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (a) =>
        a.id?.toLowerCase().includes(q) ||
        a.customerName?.toLowerCase().includes(q) ||
        a.sampleLocation?.toLowerCase().includes(q)
    )
  }, [approvals, search])

  const columns = useMemo<ColumnDef<ApprovalRequest>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={
              filteredApprovals.length > 0 &&
              filteredApprovals.every((a) => selectedIds.has(a.id))
            }
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds(new Set(filteredApprovals.map((a) => a.id)))
              } else {
                setSelectedIds(new Set())
              }
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={(e) => {
              const id = row.original.id
              setSelectedIds((prev) => {
                const next = new Set(prev)
                if (e.target.checked) next.add(id)
                else next.delete(id)
                return next
              })
            }}
            aria-label={`Select ${row.original.id}`}
          />
        ),
      },
      {
        accessorKey: 'id',
        header: ({ column }) => <SortableHeader column={column} sortLabel="ID">ID</SortableHeader>,
        cell: ({ row }) => (
          <Link
            to={`/dashboard/approvals/${row.original.id}`}
            className="font-mono text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            aria-label={`View approval details for ${row.original.id}`}
          >
            {row.original.id?.slice(0, 8)}…
          </Link>
        ),
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => <SortableHeader column={column} sortLabel="Customer">Customer</SortableHeader>,
        cell: ({ row }) => row.original.customerName ?? '—',
      },
      {
        accessorKey: 'sampleLocation',
        header: ({ column }) => <SortableHeader column={column} sortLabel="Sample">Sample</SortableHeader>,
        cell: ({ row }) => row.original.sampleLocation ?? '—',
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column} sortLabel="Status">Status</SortableHeader>,
        cell: ({ row }) => {
          const s = row.original.status
          const variant =
            s === 'approved'
              ? 'approved'
              : s === 'rejected'
                ? 'rejected'
                : s === 'corrective_action'
                  ? 'corrective_action'
                  : s === 'under_review'
                    ? 'under_review'
                    : 'pending'
          return <Badge variant={variant}>{STATUS_LABELS[s] ?? s}</Badge>
        },
      },
      {
        accessorKey: 'daysInQueue',
        header: ({ column }) => <SortableHeader column={column} sortLabel="Days in queue">Days</SortableHeader>,
        cell: ({ row }) => row.original.daysInQueue ?? '—',
      },
      {
        id: 'sla',
        header: 'SLA',
        cell: ({ row }) => {
          const due = row.original.slaDue
          if (!due) return '—'
          const d = new Date(due)
          const overdue = d < new Date()
          return (
            <span className={cn(overdue && 'text-destructive font-medium')}>
              {overdue ? 'Overdue' : format(d, 'MMM d')}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Open actions menu for approval ${row.original.id}`}
              >
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/dashboard/approvals/${row.original.id}`}>View Details</Link>
              </DropdownMenuItem>
              {(row.original.status === 'pending' || row.original.status === 'under_review') &&
                hasPermission('approvals', 'execute') && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        approveMutation.mutate(
                          {
                            id: row.original.id,
                            payload: {
                              signature: {
                                signerId: user?.id ?? '',
                                name: user?.displayName ?? '',
                                role: user?.role ?? 'Lab Manager',
                                signedAt: new Date().toISOString(),
                                payloadHash: `h${Date.now()}`,
                              },
                            },
                          },
                          {
                            onSuccess: () => toast.success('Approved'),
                            onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                          }
                        )
                      }}
                    >
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        rejectMutation.mutate(
                          {
                            id: row.original.id,
                            payload: { reason: 'Rejected from queue' },
                          },
                          {
                            onSuccess: () => toast.success('Rejected'),
                            onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                          }
                        )
                      }}
                    >
                      Reject
                    </DropdownMenuItem>
                  </>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [selectedIds, filteredApprovals, hasPermission, user, approveMutation, rejectMutation]
  )

  const tableInstance = useReactTable({
    data: filteredApprovals,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    batchMutation.mutate(
      {
        action: 'approve',
        ids,
        notes: batchNotes,
        signature: {
          signerId: user?.id ?? '',
          name: user?.displayName ?? '',
          role: user?.role ?? 'Lab Manager',
          signedAt: new Date().toISOString(),
          payloadHash: `batch-${Date.now()}`,
        },
      },
      {
        onSuccess: (r) => {
          toast.success(`Approved ${r.success} item(s)`)
          setSelectedIds(new Set())
          setBatchModal(null)
          setBatchNotes('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Batch failed'),
      }
    )
  }

  const handleBatchReject = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    batchMutation.mutate(
      { action: 'reject', ids, notes: batchNotes },
      {
        onSuccess: (r) => {
          toast.success(`Rejected ${r.success} item(s)`)
          setSelectedIds(new Set())
          setBatchModal(null)
          setBatchNotes('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Batch failed'),
      }
    )
  }

  const handleBatchCorrective = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || !correctiveDescription.trim() || !correctiveDueDate) return
    batchMutation.mutate(
      {
        action: 'corrective_action',
        ids,
        notes: batchNotes,
        correctiveAction: {
          description: correctiveDescription.trim(),
          dueDate: correctiveDueDate,
          assignedTo: correctiveAssignee || undefined,
        },
      },
      {
        onSuccess: (r) => {
          toast.success(`Corrective action requested for ${r.success} item(s)`)
          setSelectedIds(new Set())
          setBatchModal(null)
          setCorrectiveDescription('')
          setCorrectiveDueDate('')
          setCorrectiveAssignee('')
          setBatchNotes('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Batch failed'),
      }
    )
  }

  const handleBatchReassign = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0 || !reassignUserId) return
    batchMutation.mutate(
      {
        action: 'reassign',
        ids,
        notes: reassignMessage,
        reassignment: { newAssigneeId: reassignUserId },
      },
      {
        onSuccess: (r) => {
          toast.success(`Reassigned ${r.success} item(s)`)
          setSelectedIds(new Set())
          setBatchModal(null)
          setReassignUserId('')
          setReassignMessage('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Batch failed'),
      }
    )
  }

  if (!hasPermission('approvals', 'read') && !hasPermission('approvals', 'execute')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the approval queue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Approval queue – review and sign off on lab results
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-border">
          <CardHeader>
            <CardTitle className="text-base">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{summary.inQueue ?? count}</p>
            )}
          </CardContent>
        </Card>
        <Card className={cn((summary.overdue ?? 0) > 0 && 'border-destructive/50', 'border-border')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Overdue
              {(summary.overdue ?? 0) > 0 && (
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{summary.overdue ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <CardTitle>Approval Queue</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
                <Input
                  placeholder="Search approvals by ID, customer, or sample location..."
                  className="pl-9 w-48 sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search approvals"
                />
              </div>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="corrective_action">Corrective Action</SelectItem>
                </SelectContent>
              </Select>
              {selectedIds.size > 0 && hasPermission('approvals', 'execute') && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('reject')}
                    aria-label={`Batch reject ${selectedIds.size} selected approvals`}
                  >
                    <XCircle className="h-4 w-4 mr-1" aria-hidden />
                    Reject ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBatchModal('approve')}
                    aria-label={`Batch approve ${selectedIds.size} selected approvals`}
                  >
                    <Check className="h-4 w-4 mr-1" aria-hidden />
                    Approve ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('corrective')}
                    aria-label={`Request corrective action for ${selectedIds.size} selected approvals`}
                  >
                    <Wrench className="h-4 w-4 mr-1" aria-hidden />
                    Corrective ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('reassign')}
                    aria-label={`Reassign ${selectedIds.size} selected approvals`}
                  >
                    <UserPlus className="h-4 w-4 mr-1" aria-hidden />
                    Reassign ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4" role="status" aria-label="Loading approvals">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : isError ? (
            <div
              className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-border bg-muted/20"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-12 w-12 text-destructive mb-4" aria-hidden />
              <p className="font-medium text-foreground">Failed to load approvals</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              </p>
              <Button
                variant="outline"
                className="mt-4 min-h-[44px]"
                onClick={() => refetch()}
                aria-label="Retry loading approvals"
              >
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
                Try again
              </Button>
            </div>
          ) : (filteredApprovals ?? []).length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg border border-border bg-muted/10"
              role="status"
              aria-label="No approvals in queue"
            >
              <div className="rounded-full bg-muted/50 p-4 mb-4">
                <Inbox className="h-12 w-12 text-muted-foreground" aria-hidden />
              </div>
              <p className="font-medium text-foreground">No approvals in queue</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                {search.trim()
                  ? 'No approvals match your search. Try adjusting your filters or search terms.'
                  : 'Approvals are created when lab results are submitted for review.'}
              </p>
              {search.trim() && (
                <Button
                  variant="outline"
                  className="mt-6 min-h-[44px]"
                  onClick={() => setSearch('')}
                  aria-label="Clear search and show all approvals"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  {tableInstance.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-left text-sm font-medium"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {tableInstance.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border transition-colors hover:bg-muted/30"
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={batchModal === 'approve'} onOpenChange={(o) => !o && setBatchModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Approve</DialogTitle>
            <DialogDescription>
              Approve {selectedIds.size} item(s) with your signature.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="batch-approve-notes" className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              id="batch-approve-notes"
              className="mt-1"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              aria-label="Optional notes for batch approval"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)} aria-label="Cancel batch approve">
              Cancel
            </Button>
            <Button
              onClick={handleBatchApprove}
              disabled={batchMutation.isPending}
              aria-label={`Approve ${selectedIds.size} selected items`}
            >
              {batchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Approve ${selectedIds.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchModal === 'reject'} onOpenChange={(o) => !o && setBatchModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Reject</DialogTitle>
            <DialogDescription>
              Reject {selectedIds.size} item(s). Provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="batch-reject-reason" className="text-sm font-medium">Reason</Label>
            <Textarea
              id="batch-reject-reason"
              className="mt-1"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              aria-label="Reason for batch rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)} aria-label="Cancel batch reject">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={!batchNotes.trim() || batchMutation.isPending}
              aria-label={`Reject ${selectedIds.size} selected items`}
            >
              {batchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Reject ${selectedIds.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchModal === 'corrective'} onOpenChange={(o) => !o && setBatchModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Corrective Action</DialogTitle>
            <DialogDescription>
              Request corrective action for {selectedIds.size} item(s). Provide description and due date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="corrective-description">Description *</Label>
              <Textarea
                id="corrective-description"
                className="mt-1"
                value={correctiveDescription}
                onChange={(e) => setCorrectiveDescription(e.target.value)}
                placeholder="Describe the corrective action required..."
                rows={3}
                aria-label="Corrective action description"
              />
            </div>
            <div>
              <Label htmlFor="corrective-due-date">Due Date *</Label>
              <Input
                id="corrective-due-date"
                type="date"
                value={correctiveDueDate}
                onChange={(e) => setCorrectiveDueDate(e.target.value)}
                className="mt-1"
                aria-label="Corrective action due date"
              />
            </div>
            <div>
              <Label htmlFor="corrective-assignee">Assign To (optional)</Label>
              <Select value={correctiveAssignee || 'none'} onValueChange={(v) => setCorrectiveAssignee(v === 'none' ? '' : v)}>
                <SelectTrigger id="corrective-assignee" className="mt-1" aria-label="Assign corrective action to lab manager">
                  <SelectValue placeholder="— Select —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select —</SelectItem>
                  {(labManagers ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name ?? m.email} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)} aria-label="Cancel corrective action">
              Cancel
            </Button>
            <Button
              onClick={handleBatchCorrective}
              disabled={
                !correctiveDescription.trim() ||
                !correctiveDueDate ||
                batchMutation.isPending
              }
              aria-label={`Request corrective action for ${selectedIds.size} items`}
            >
              {batchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Request for ${selectedIds.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchModal === 'reassign'} onOpenChange={(o) => !o && setBatchModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Reassign</DialogTitle>
            <DialogDescription>
              Reassign {selectedIds.size} item(s) to another lab manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reassign-assignee">New Assignee *</Label>
              <Select value={reassignUserId || 'none'} onValueChange={(v) => setReassignUserId(v === 'none' ? '' : v)}>
                <SelectTrigger id="reassign-assignee" className="mt-1" aria-label="Select lab manager to reassign to">
                  <SelectValue placeholder="— Select Lab Manager —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select Lab Manager —</SelectItem>
                  {(labManagers ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name ?? m.email} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reassign-message">Message (optional)</Label>
              <Textarea
                id="reassign-message"
                className="mt-1"
                value={reassignMessage}
                onChange={(e) => setReassignMessage(e.target.value)}
                placeholder="Optional message for the assignee..."
                rows={2}
                aria-label="Optional message for reassignment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)} aria-label="Cancel reassignment">
              Cancel
            </Button>
            <Button
              onClick={handleBatchReassign}
              disabled={!reassignUserId || batchMutation.isPending}
              aria-label={`Reassign ${selectedIds.size} items`}
            >
              {batchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Reassign ${selectedIds.size}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
