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
  const [statusFilter, setStatusFilter] = useState<string>('')
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
      status: (statusFilter || undefined) as ApprovalRequest['status'] | undefined,
    }),
    [statusFilter]
  )

  const { data, isLoading } = usePendingApprovals(filters)
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
        header: ({ column }) => <SortableHeader column={column}>ID</SortableHeader>,
        cell: ({ row }) => (
          <Link
            to={`/dashboard/approvals/${row.original.id}`}
            className="font-mono text-sm text-primary hover:underline"
          >
            {row.original.id?.slice(0, 8)}…
          </Link>
        ),
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
        cell: ({ row }) => row.original.customerName ?? '—',
      },
      {
        accessorKey: 'sampleLocation',
        header: ({ column }) => <SortableHeader column={column}>Sample</SortableHeader>,
        cell: ({ row }) => row.original.sampleLocation ?? '—',
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
        cell: ({ row }) => {
          const s = row.original.status
          const variant =
            s === 'approved' ? 'approved' : s === 'rejected' ? 'rejected' : s === 'corrective_action' ? 'warning' : 'pending'
          return <Badge variant={variant}>{STATUS_LABELS[s] ?? s}</Badge>
        },
      },
      {
        accessorKey: 'daysInQueue',
        header: ({ column }) => <SortableHeader column={column}>Days</SortableHeader>,
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
              <Button variant="ghost" size="sm">
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
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-base">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.inQueue ?? count}</p>
          </CardContent>
        </Card>
        <Card className={cn((summary.overdue ?? 0) > 0 && 'border-destructive/50')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Overdue
              {(summary.overdue ?? 0) > 0 && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.overdue ?? 0}</p>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 w-48 sm:w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="corrective_action">Corrective Action</option>
              </select>
              {selectedIds.size > 0 && hasPermission('approvals', 'execute') && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('reject')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject ({selectedIds.size})
                  </Button>
                  <Button size="sm" onClick={() => setBatchModal('approve')}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('corrective')}
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Corrective ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchModal('reassign')}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Reassign ({selectedIds.size})
                  </Button>
                </div>
              )}
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
              {(filteredApprovals ?? []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No approvals in queue</p>
                  <p className="text-sm mt-1">
                    Approvals are created when lab results are submitted for review.
                  </p>
                </div>
              )}
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
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchApprove}
              disabled={batchMutation.isPending}
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
            <Label className="text-sm font-medium">Reason</Label>
            <Textarea
              className="mt-1"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={!batchNotes.trim() || batchMutation.isPending}
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
              <Label>Description *</Label>
              <Textarea
                className="mt-1"
                value={correctiveDescription}
                onChange={(e) => setCorrectiveDescription(e.target.value)}
                placeholder="Describe the corrective action required..."
                rows={3}
              />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={correctiveDueDate}
                onChange={(e) => setCorrectiveDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Assign To (optional)</Label>
              <select
                value={correctiveAssignee}
                onChange={(e) => setCorrectiveAssignee(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {(labManagers ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchCorrective}
              disabled={
                !correctiveDescription.trim() ||
                !correctiveDueDate ||
                batchMutation.isPending
              }
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
              <Label>New Assignee *</Label>
              <select
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select Lab Manager —</option>
                {(labManagers ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.email} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea
                className="mt-1"
                value={reassignMessage}
                onChange={(e) => setReassignMessage(e.target.value)}
                placeholder="Optional message for the assignee..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchReassign}
              disabled={!reassignUserId || batchMutation.isPending}
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
