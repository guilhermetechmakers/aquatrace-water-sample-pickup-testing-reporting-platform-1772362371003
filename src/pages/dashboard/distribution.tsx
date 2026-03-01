/**
 * Distribution & Reissue Controls (page_014)
 * Email settings, reissue initiation, portal storage toggle
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw, Send, FileCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useRBAC } from '@/hooks/useRBAC'
import { useReportByApprovalId, useSendReportEmail } from '@/hooks/useReportsPdf'

export function DistributionPage() {
  const { hasPermission } = useRBAC()
  const [approvalId, setApprovalId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [portalEnabled, setPortalEnabled] = useState(true)

  const { data: report, isLoading } = useReportByApprovalId(approvalId || null)
  const sendEmailMutation = useSendReportEmail()

  const handleSendEmail = () => {
    if (!report?.id || !recipient.trim()) {
      toast.error('Report and recipient email are required')
      return
    }
    sendEmailMutation.mutate(
      {
        reportId: report.id,
        version: report.currentVersion ?? 1,
        recipient: recipient.trim(),
        reportTitle: `Water Test Report ${report.reportId}`,
      },
      {
        onSuccess: () => toast.success('Email sent'),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Email failed'),
      }
    )
  }

  if (!hasPermission('reports', 'read') && !hasPermission('reports', 'execute')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access distribution controls.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Distribution Controls</h1>
        <p className="text-muted-foreground mt-1">
          Email distribution, reissue initiation, and portal storage
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Distribution
            </CardTitle>
            <CardDescription>
              Send report PDF to customer. Enter approval ID to load report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="approval-id">Approval ID</Label>
              <Input
                id="approval-id"
                placeholder="e.g. abc123..."
                value={approvalId}
                onChange={(e) => setApprovalId(e.target.value)}
                className="mt-1"
              />
            </div>
            {report && (
              <>
                <div>
                  <Label htmlFor="recipient">Recipient Email</Label>
                  <Input
                    id="recipient"
                    type="email"
                    placeholder="customer@example.com"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSendEmail}
                    disabled={!recipient.trim() || sendEmailMutation.isPending}
                  >
                    {sendEmailMutation.isPending ? (
                      <span className="animate-pulse">Sending…</span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send Report
                      </>
                    )}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/dashboard/approvals/${approvalId}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open Approval
                    </Link>
                  </Button>
                </div>
              </>
            )}
            {approvalId && isLoading && (
              <Skeleton className="h-10 w-full" />
            )}
            {approvalId && !isLoading && !report && (
              <p className="text-sm text-muted-foreground">No report found for this approval.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Reissue
            </CardTitle>
            <CardDescription>
              Create a new version of a report. Use the Approval Details page to reissue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/dashboard/approvals">
                <FileCheck className="h-4 w-4 mr-1" />
                Go to Approvals
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portal Storage</CardTitle>
          <CardDescription>
            When enabled, approved reports are available in the customer portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              id="portal-enabled"
              checked={portalEnabled}
              onCheckedChange={setPortalEnabled}
            />
            <Label htmlFor="portal-enabled">Reports visible in customer portal</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
