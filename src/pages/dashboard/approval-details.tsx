/**
 * Approval Details Page (page_013)
 * Single result submission with test results, files, comments, audit trail, signature.
 * PDF report generation, versioning, reissue, and email distribution.
 */

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  UserPlus,
  Wrench,
  Mail,
  RefreshCw,
  FileCheck,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  AttachmentGallery,
  VersionSwitcher,
  PDFPreviewModal,
  ApprovalDetailsPanel,
  SignatureBlock,
} from '@/components/reports'
import {
  useApproval,
  useApproveApproval,
  useRejectApproval,
  useAddApprovalComment,
  useRequestCorrectiveAction,
  useReassignApproval,
} from '@/hooks/useApprovals'
import {
  useReportByApprovalId,
  useReportVersions,
  useEnsureReportForApproval,
  useGenerateReportPdf,
  useSendReportEmail,
  useReissueReport,
  useReportPdfUrl,
} from '@/hooks/useReportsPdf'
import { useRBAC } from '@/hooks/useRBAC'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { createAuditLog } from '@/api/audit'
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

  const { data: approval, isLoading, isError, error, refetch } = useApproval(id ?? null)
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
  const [labManagersLoading, setLabManagersLoading] = useState(true)
  const [labManagersError, setLabManagersError] = useState<string | null>(null)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(1)

  const ensureReportMutation = useEnsureReportForApproval()
  const { data: report, isLoading: reportLoading, isError: reportError, error: reportErrorObj, refetch: refetchReport } = useReportByApprovalId(id ?? null)
  const { data: versions = [] } = useReportVersions(id ?? null)
  const generatePdfMutation = useGenerateReportPdf()
  const sendEmailMutation = useSendReportEmail()
  const reissueMutation = useReissueReport()

  const selectedVersionData = (versions ?? []).find((v) => v.version === selectedVersion)
  const { data: pdfUrl, isLoading: pdfUrlLoading } = useReportPdfUrl(
    pdfModalOpen ? (selectedVersionData?.pdfStoragePath ?? null) : null
  )

  useEffect(() => {
    const list = Array.isArray(versions) ? versions : []
    if (list.length > 0 && selectedVersion === 1) {
      const latest = Math.max(...list.map((v) => v.version ?? 1))
      setSelectedVersion(latest)
    }
  }, [versions])

  useEffect(() => {
    setLabManagersLoading(true)
    setLabManagersError(null)
    fetchLabManagers()
      .then((list) => {
        setLabManagers(Array.isArray(list) ? list : [])
        setLabManagersError(null)
      })
      .catch((err) => {
        setLabManagers([])
        setLabManagersError(err instanceof Error ? err.message : 'Failed to load lab managers')
      })
      .finally(() => setLabManagersLoading(false))
  }, [])

  useEffect(() => {
    if (
      id &&
      approval?.customerId &&
      approval?.resultId &&
      approval?.sampleId &&
      !report &&
      !ensureReportMutation.data &&
      !ensureReportMutation.isPending
    ) {
      ensureReportMutation.mutate({
        approvalId: id,
        customerId: approval.customerId,
        resultId: approval.resultId,
        sampleId: approval.sampleId,
      })
    }
  }, [id, approval?.customerId, approval?.resultId, approval?.sampleId, report, ensureReportMutation.data, ensureReportMutation.isPending])

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

  const handleViewPdf = () => setPdfModalOpen(true)

  const handleGeneratePdf = () => {
    if (!id || !safeApproval.customerId) return
    const pickupData = {
      technicianName: safeApproval.labTechnicianName ?? undefined,
      pickupTime: safeApproval.createdAt ?? undefined,
      location: safeApproval.sampleLocation ?? undefined,
      pH: safeApproval.testResults?.pH ?? undefined,
      chlorine: safeApproval.testResults?.chlorine ?? undefined,
    }
    const labResults = {
      spcResult: safeApproval.testResults?.spc ?? undefined,
      spcUnit: safeApproval.testResults?.spcUnit ?? undefined,
      totalColiformResult: safeApproval.testResults?.totalColiform ?? undefined,
      totalColiformUnit: safeApproval.testResults?.totalColiformUnit ?? undefined,
      testedBy: safeApproval.labTechnicianName ?? undefined,
      testedAt: safeApproval.createdAt ?? undefined,
    }
    const attachments = (supportingFiles ?? []).map((f) => ({
      id: f.id,
      filename: f.name,
      fileType: f.type,
      url: f.url,
    }))
    generatePdfMutation.mutate(
      {
        approvalId: id,
        customerId: safeApproval.customerId,
        pickupData,
        labResults,
        attachments,
        signature: safeApproval.signature
          ? {
              id: safeApproval.signature.id,
              signerName: safeApproval.signature.signerName,
              signerRole: safeApproval.signature.signerRole,
              signedAt: safeApproval.signature.signedAt,
              signatureImageUrl: safeApproval.signature.signatureData ?? undefined,
            }
          : null,
        auditTrail: (auditTrail ?? []).map((e) => ({
          action: e.action,
          performedBy: e.by ?? undefined,
          performedAt: e.at ?? '',
          note: e.details != null ? String(e.details) : undefined,
        })),
      },
      {
        onSuccess: (_data, variables) => {
          toast.success('PDF generated')
          refetchReport()
          createAuditLog({
            userId: user?.id ?? '',
            userName: user?.displayName ?? user?.email ?? undefined,
            actionType: 'EXPORT',
            resourceType: 'REPORT',
            resourceId: variables.customerId ?? id ?? '',
            metadata: { approvalId: id, reportId: report?.id, version: selectedVersion },
          })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'PDF generation failed'),
      }
    )
  }

  const [customerEmail, setCustomerEmail] = useState('')
  const [customerEmailError, setCustomerEmailError] = useState<string | null>(null)
  useEffect(() => {
    if (!safeApproval.customerId) return
    setCustomerEmailError(null)
    const loadEmail = async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('email')
        .eq('id', safeApproval.customerId)
        .single()
      if (error) {
        setCustomerEmailError('Could not load customer email')
        return
      }
      setCustomerEmail((data as { email?: string } | null)?.email ?? '')
    }
    void loadEmail()
  }, [safeApproval.customerId])

  const handleEmailToCustomer = () => {
    if (!report || !safeApproval.customerName) {
      toast.error('Report or customer email not available')
      return
    }
    const recipient = (customerEmail || (approval as { customerEmail?: string })?.customerEmail) ?? ''
    if (!recipient) {
      toast.error('Customer email not found')
      return
    }
    sendEmailMutation.mutate(
      {
        reportId: report.id,
        version: selectedVersion,
        recipient,
        customerName: safeApproval.customerName,
        reportTitle: `Water Test Report ${report.reportId}`,
        pickupDate: safeApproval.createdAt ? format(new Date(safeApproval.createdAt), 'PP') : undefined,
      },
      {
        onSuccess: (_data, variables) => {
          toast.success('Email sent')
          createAuditLog({
            userId: user?.id ?? '',
            userName: user?.displayName ?? user?.email ?? undefined,
            actionType: 'DISTRIBUTE',
            resourceType: 'REPORT',
            resourceId: report?.id ?? '',
            metadata: { reportId: report?.id, version: variables.version, recipient: variables.recipient },
          })
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Email failed'),
      }
    )
  }

  const handleReissue = () => {
    if (!report?.id || !id || !safeApproval.customerId) return
    const pickupData = {
      technicianName: safeApproval.labTechnicianName ?? undefined,
      pickupTime: safeApproval.createdAt ?? undefined,
      location: safeApproval.sampleLocation ?? undefined,
      pH: safeApproval.testResults?.pH ?? undefined,
      chlorine: safeApproval.testResults?.chlorine ?? undefined,
    }
    const labResults = {
      spcResult: safeApproval.testResults?.spc ?? undefined,
      spcUnit: safeApproval.testResults?.spcUnit ?? undefined,
      totalColiformResult: safeApproval.testResults?.totalColiform ?? undefined,
      totalColiformUnit: safeApproval.testResults?.totalColiformUnit ?? undefined,
      testedBy: safeApproval.labTechnicianName ?? undefined,
      testedAt: safeApproval.createdAt ?? undefined,
    }
    const attachments = (supportingFiles ?? []).map((f) => ({
      id: f.id,
      filename: f.name,
      fileType: f.type,
      url: f.url,
    }))
    reissueMutation.mutate(
      {
        reportId: report.id,
        approvalId: id,
        customerId: safeApproval.customerId,
        pickupData,
        labResults,
        attachments,
        signature: safeApproval.signature
          ? {
              id: safeApproval.signature.id,
              signerName: safeApproval.signature.signerName,
              signerRole: safeApproval.signature.signerRole,
              signedAt: safeApproval.signature.signedAt,
              signatureImageUrl: safeApproval.signature.signatureData ?? undefined,
            }
          : null,
        auditTrail: (auditTrail ?? []).map((e) => ({
          action: e.action,
          performedBy: e.by ?? undefined,
          performedAt: e.at ?? '',
          note: e.details != null ? String(e.details) : undefined,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Report reissued')
          refetchReport()
          setSelectedVersion((v) => v + 1)
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Reissue failed'),
      }
    )
  }

  const reportAttachments = (report?.attachments ?? []).length > 0
    ? (report?.attachments ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
        fileType: a.fileType,
        url: a.url,
        storagePath: a.storagePath,
        size: a.size,
        hash: a.hash,
        embedded: a.embedded,
      }))
    : (supportingFiles ?? []).map((f) => ({
        id: f.id,
        filename: f.name,
        fileType: f.type,
        url: f.url,
      }))

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
      <div className="space-y-8 animate-fade-in" role="status" aria-label="Loading approval details">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div
              className="flex flex-col items-center justify-center py-8 text-center"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-12 w-12 text-destructive mb-4" aria-hidden />
              <CardTitle>Failed to load approval</CardTitle>
              <CardDescription className="mt-2">
                {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => refetch()} aria-label="Retry loading approval">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/approvals">Back to Queue</Link>
            </Button>
          </CardContent>
        </Card>
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
          <Button variant="ghost" size="icon" asChild aria-label="Back to approvals queue">
            <Link to="/dashboard/approvals">
              <ArrowLeft className="h-5 w-5" aria-hidden />
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
          {safeApproval.status === 'approved' && !report && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGeneratePdf}
              disabled={generatePdfMutation.isPending || !safeApproval.customerId}
            >
              {generatePdfMutation.isPending ? (
                <span className="animate-pulse">Generating…</span>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-1" />
                  Generate PDF
                </>
              )}
            </Button>
          )}
          {report && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleViewPdf}>
                  <FileCheck className="h-4 w-4 mr-1" />
                  View PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmailToCustomer}
                  disabled={!customerEmail || sendEmailMutation.isPending || !!customerEmailError}
                  title={customerEmailError ?? undefined}
                  aria-label={customerEmailError ? `Email to customer (${customerEmailError})` : 'Email to customer'}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email to Customer
                </Button>
                <Button size="sm" variant="outline" onClick={handleReissue} disabled={reissueMutation.isPending}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reissue
                </Button>
              </div>
              {customerEmailError && (
                <span className="text-xs text-destructive" role="alert">
                  {customerEmailError}
                </span>
              )}
            </div>
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

      {reportLoading && !report && (ensureReportMutation.isPending || safeApproval.status === 'approved') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
      )}

      {reportError && !report && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center" role="alert">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" aria-hidden />
            <p className="font-medium text-foreground">Failed to load report</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {reportErrorObj instanceof Error ? reportErrorObj.message : 'Something went wrong loading the report.'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetchReport()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {report && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Report {report.reportId}
                </CardTitle>
                <CardDescription>Version history and attachments</CardDescription>
              </div>
              <VersionSwitcher
                versions={versions as import('@/types/reports').ReportVersion[]}
                currentVersion={selectedVersion}
                onVersionChange={setSelectedVersion}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ApprovalDetailsPanel title="Attachments" description="Files included in report" defaultOpen>
              <AttachmentGallery attachments={reportAttachments} />
            </ApprovalDetailsPanel>
            {safeApproval.signature && (
              <ApprovalDetailsPanel title="Manager Signature" defaultOpen>
                <SignatureBlock
                  signature={{
                    id: safeApproval.signature.id,
                    signerName: safeApproval.signature.signerName,
                    signerRole: safeApproval.signature.signerRole,
                    signedAt: safeApproval.signature.signedAt,
                    signatureImageUrl: safeApproval.signature.signatureData ?? undefined,
                  }}
                />
              </ApprovalDetailsPanel>
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="mt-4 space-y-2">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              aria-label="Reason for rejection"
            />
          </div>
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
              <Select
                value={correctiveAssignee || 'none'}
                onValueChange={(v) => setCorrectiveAssignee(v === 'none' ? '' : v)}
                disabled={labManagersLoading}
              >
                <SelectTrigger id="corrective-assignee" className="mt-1" aria-label="Assign corrective action to lab manager">
                  <SelectValue placeholder={labManagersLoading ? 'Loading…' : labManagersError ?? '— Select —'} />
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
              {labManagersLoading && (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading lab managers…
                </p>
              )}
              {labManagersError && !labManagersLoading && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {labManagersError}
                </p>
              )}
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
              <Select
                value={reassignUserId || 'none'}
                onValueChange={(v) => setReassignUserId(v === 'none' ? '' : v)}
                disabled={labManagersLoading}
              >
                <SelectTrigger id="reassign-user" className="mt-1" aria-label="Select lab manager to reassign approval to">
                  <SelectValue placeholder={labManagersLoading ? 'Loading…' : labManagersError ?? '— Select Lab Manager —'} />
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
              {labManagersLoading && (
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading lab managers…
                </p>
              )}
              {labManagersError && !labManagersLoading && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {labManagersError}
                </p>
              )}
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

      <PDFPreviewModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        pdfUrl={pdfUrl ?? undefined}
        reportId={report?.reportId}
        version={selectedVersion}
        isLoading={pdfUrlLoading}
      />
    </div>
  )
}
