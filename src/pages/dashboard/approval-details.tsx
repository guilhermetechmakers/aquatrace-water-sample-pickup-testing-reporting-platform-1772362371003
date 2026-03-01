/**
 * Approval Details Page (page_011)
 * Single result submission with test results, files, comments, audit trail, signature
 */

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  FileText,
  Download,
  UserPlus,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CommentThread, SignatureWidget } from '@/components/approvals'
import {
  useApproval,
  useApproveApproval,
  useRejectApproval,
  useAddApprovalComment,
  useRequestCorrectiveAction,
  useReassignApproval,
} from '@/hooks/useApprovals'
import { useRBAC } from '@/hooks/useRBAC'
import { useAuth } from '@/contexts/auth-context'
import { fetchLabManagers } from '@/api/users'
import type { ProfileUser } from '@/api/users'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { ApprovalRequest } from '@/types/approvals'


const STATUS_VARIANTS: Record<ApprovalRequest['status'], 'pending' | 'under_review' | 'approved' | 'rejected' | 'corrective_action' | 'secondary'> = {
  pending: 'pending',
  under_review: 'under_review',
  approved: 'approved',
  rejected: 'rejected',
  corrective_action: 'corrective_action',
}

const STATUS_LABELS: Record<ApprovalRequest['status'], string> = {
  pending: 'Pending Approval',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  corrective_action: 'Corrective Action Required',
}

export function ApprovalDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { hasPermission } = useRBAC()

  const { data: approval, isLoading } = useApproval(id ?? null)
  const approveMutation = useApproveApproval()
  const rejectMutation = useRejectApproval()
  const addCommentMutation = useAddApprovalComment()
  const correctiveActionMutation = useRequestCorrectiveAction()
  const reassignMutation = useReassignApproval()

  const [rejectModal, setRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [correctiveModal, setCorrectiveModal] = useState(false)
  const [correctiveDescription, setCorrectiveDescription] = useState('')
  const [correctiveDueDate, setCorrectiveDueDate] = useState('')
  const [correctiveAssignee, setCorrectiveAssignee] = useState('')
  const [reassignModal, setReassignModal] = useState(false)
  const [reassignUserId, setReassignUserId] = useState('')
  const [reassignMessage, setReassignMessage] = useState('')
  const [labManagers, setLabManagers] = useState<ProfileUser[]>([])

  useEffect(() => {
    fetchLabManagers()
      .then((list) => setLabManagers(Array.isArray(list) ? list : []))
      .catch(() => setLabManagers([]))
  }, [])

  const safeApproval = approval ?? ({} as ApprovalRequest)
  const comments = safeApproval.comments ?? []
  const supportingFiles = safeApproval.supportingFiles ?? []
  const auditTrail = safeApproval.auditTrail ?? []

  const isOverdue = safeApproval.slaDue ? new Date(safeApproval.slaDue) < new Date() : false
  const canAct = (safeApproval.status === 'pending' || safeApproval.status === 'under_review' || safeApproval.status === 'corrective_action') &&
    hasPermission('approvals', 'execute')

  const handleApprove = () => {
    if (!id) return
    const payload = {
      signature: {
        signerId: user?.id ?? '',
        name: user?.displayName ?? 'Lab Manager',
        role: user?.role ?? 'LAB_MANAGER',
        signedAt: new Date().toISOString(),
        payloadHash: `h${Date.now()}`,
      },
    }
    approveMutation.mutate(
      { id, payload },
      {
        onSuccess: () => toast.success('Approved'),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Approve failed'),
      }
    )
  }

  const handleReject = () => {
    if (!id) return
    rejectMutation.mutate(
      { id, payload: { reason: rejectReason || 'Rejected by manager' } },
      {
        onSuccess: () => {
          toast.success('Rejected')
          setRejectModal(false)
          setRejectReason('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Reject failed'),
      }
    )
  }

  const handleAddComment = async (message: string) => {
    if (!id) return
    try {
      await addCommentMutation.mutateAsync({ id, message, role: user?.role })
      toast.success('Comment added')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add comment')
    }
  }

  const handleCorrectiveAction = () => {
    if (!id || !correctiveDescription.trim() || !correctiveDueDate) return
    correctiveActionMutation.mutate(
      {
        id,
        payload: {
          description: correctiveDescription.trim(),
          dueDate: correctiveDueDate,
          assignedTo: correctiveAssignee || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Corrective action requested')
          setCorrectiveModal(false)
          setCorrectiveDescription('')
          setCorrectiveDueDate('')
          setCorrectiveAssignee('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      }
    )
  }

  const handleReassign = () => {
    if (!id || !reassignUserId) return
    reassignMutation.mutate(
      { id, payload: { newAssigneeId: reassignUserId, message: reassignMessage.trim() || undefined } },
      {
        onSuccess: () => {
          toast.success('Reassigned')
          setReassignModal(false)
          setReassignUserId('')
          setReassignMessage('')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
      }
    )
  }

  if (!id) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Approval ID is required.</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link to="/dashboard/approvals">Back to Queue</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Not Found</CardTitle>
            <CardDescription>Approval not found or you do not have access.</CardDescription>
          </CardHeader>
          <Button asChild>
            <Link to="/dashboard/approvals">Back to Queue</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/approvals">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Approval Details</h1>
            <p className="text-muted-foreground text-sm">
              {safeApproval.id?.slice(0, 8)}… · {safeApproval.customerName ?? '—'} · {safeApproval.sampleLocation ?? safeApproval.sampleId?.slice(0, 8) ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANTS[safeApproval.status] ?? 'secondary'}>
            {STATUS_LABELS[safeApproval.status]}
          </Badge>
          {isOverdue && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </Badge>
          )}
          {canAct && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectModal(true)}>
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCorrectiveModal(true)}>
                <Wrench className="h-4 w-4 mr-1" />
                Corrective Action
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReassignModal(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Reassign
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>SPC and Total Coliform values</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">SPC</p>
                <p className="font-semibold">{safeApproval.testResults?.spc ?? '—'} {safeApproval.testResults?.spcUnit ?? ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Coliform</p>
                <p className="font-semibold">{safeApproval.testResults?.totalColiform ?? '—'} {safeApproval.testResults?.totalColiformUnit ?? ''}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">pH</p>
                <p className="font-semibold">{safeApproval.testResults?.pH ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chlorine</p>
                <p className="font-semibold">{safeApproval.testResults?.chlorine ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Method</p>
                <p className="font-medium">{safeApproval.testResults?.method ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>Sample and submission info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sample ID</span>
              <span className="font-mono">{safeApproval.sampleId?.slice(0, 12) ?? '—'}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Result ID</span>
              <span className="font-mono">{safeApproval.resultId?.slice(0, 12) ?? '—'}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{safeApproval.createdAt ? format(new Date(safeApproval.createdAt), 'PPpp') : '—'}</span>
            </div>
            {safeApproval.daysInQueue != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days in Queue</span>
                <span>{safeApproval.daysInQueue}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Supporting Files</CardTitle>
          </div>
          <CardDescription>Instrument outputs and lab certificates</CardDescription>
        </CardHeader>
        <CardContent>
          {supportingFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No supporting files attached.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {supportingFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{f.name}</span>
                  <Download className="h-4 w-4 shrink-0 ml-auto text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <CommentThread
              comments={comments}
              onAddComment={handleAddComment}
              isLoading={addCommentMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>Immutable record of actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {auditTrail.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No audit entries yet.</p>
              ) : (
                auditTrail.map((e) => (
                  <div key={e.id} className="flex gap-3 text-sm border-b pb-2 last:border-0">
                    <span className="font-medium shrink-0">{e.action}</span>
                    <span className="text-muted-foreground">by {e.by?.slice(0, 8) ?? '—'}</span>
                    <span className="text-muted-foreground">
                      {e.at ? format(new Date(e.at), 'MMM d, HH:mm') : '—'}
                    </span>
                    {e.details != null && (
                      <span className="truncate text-muted-foreground" title={String(e.details)}>
                        {String(e.details).slice(0, 50)}
                        {String(e.details).length > 50 ? '…' : ''}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canAct && (
        <Card>
          <CardContent className="pt-6">
            <SignatureWidget
              existingSignature={safeApproval.signature}
              signerName={user?.displayName ?? ''}
              signerRole={user?.role ?? ''}
              onSign={async (_payload) => {
                if (!id) return
                handleApprove()
              }}
              disabled={approveMutation.isPending}
              isLoading={approveMutation.isPending}
            />
          </CardContent>
        </Card>
      )}

      {safeApproval.signature && (
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
            <CardDescription>Electronic signature on file</CardDescription>
          </CardHeader>
          <CardContent>
            <SignatureWidget
              existingSignature={safeApproval.signature}
              signerName={user?.displayName ?? ''}
              signerRole={user?.role ?? ''}
            />
          </CardContent>
        </Card>
      )}

      <AlertDialog open={rejectModal} onOpenChange={setRejectModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Approval</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection. This will be recorded in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={correctiveModal} onOpenChange={setCorrectiveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Corrective Action</DialogTitle>
            <DialogDescription>
              Create a corrective action item with description and due date. Optionally assign to a lab manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="corrective-desc">Description *</Label>
              <Textarea
                id="corrective-desc"
                value={correctiveDescription}
                onChange={(e) => setCorrectiveDescription(e.target.value)}
                placeholder="Describe the corrective action required..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="corrective-due">Due Date *</Label>
              <Input
                id="corrective-due"
                type="date"
                value={correctiveDueDate}
                onChange={(e) => setCorrectiveDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="corrective-assignee">Assign To (optional)</Label>
              <select
                id="corrective-assignee"
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
            <Button variant="outline" onClick={() => setCorrectiveModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCorrectiveAction}
              disabled={
                !correctiveDescription.trim() ||
                !correctiveDueDate ||
                correctiveActionMutation.isPending
              }
            >
              {correctiveActionMutation.isPending ? 'Submitting…' : 'Request Corrective Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignModal} onOpenChange={setReassignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Approval</DialogTitle>
            <DialogDescription>
              Assign this approval to another lab manager. An optional message will be recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reassign-user">New Assignee *</Label>
              <select
                id="reassign-user"
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
              <Label htmlFor="reassign-msg">Message (optional)</Label>
              <Textarea
                id="reassign-msg"
                value={reassignMessage}
                onChange={(e) => setReassignMessage(e.target.value)}
                placeholder="Optional message for the assignee..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={!reassignUserId || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? 'Reassigning…' : 'Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
