import { CheckSquare, Check, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLabResults, useApproveLabResult } from '@/hooks/useLabResults'
import { usePickups } from '@/hooks/usePickups'
import { useRBAC } from '@/hooks/useRBAC'
import { format, differenceInHours } from 'date-fns'

export function ApprovalsPage() {
  const { hasPermission } = useRBAC()
  const { data: labResults = [] } = useLabResults()
  const { data: pickups = [] } = usePickups()
  const approveLabResult = useApproveLabResult()

  const pendingResults = (labResults ?? []).filter((lr) => lr.status === 'pending')
  const pendingWithPickup = pendingResults.map((lr) => {
    const pickup = (pickups ?? []).find((p) => p.id === lr.pickup_id)
    return { ...lr, pickup }
  })

  const handleApprove = (id: string) => {
    approveLabResult.mutate(
      { id, pdfLink: null },
      {
        onSuccess: () => toast.success('Result approved'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Approve failed'),
      }
    )
  }

  const handleDistribute = (_id: string) => {
    // Stub: would generate PDF and distribute to customer
    toast.success('PDF generation stubbed - integrate with Edge Function')
  }

  if (!hasPermission('lab_results', 'execute')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to approve lab results.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve lab test results
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <CardTitle>Pending Approvals</CardTitle>
            <Badge variant="secondary">{pendingWithPickup.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(pendingWithPickup ?? []).map((lr) => {
              const submittedAt = lr.created_at ? new Date(lr.created_at) : null
              const overdue = submittedAt ? differenceInHours(new Date(), submittedAt) > 24 : false
              return (
                <div
                  key={lr.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono font-medium text-sm">{lr.pickup_id.slice(0, 8)}...</p>
                      {overdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lr.pickup?.location ?? 'Unknown'} · SPC: {lr.spc ?? '—'} · Coliform: {lr.total_coliform ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {submittedAt ? format(submittedAt, 'PPp') : '—'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDistribute(lr.id)}
                      title="Generate PDF"
                    >
                      <FileDown className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(lr.id)}
                      disabled={approveLabResult.isPending}
                    >
                      {approveLabResult.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          {(pendingWithPickup ?? []).length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending approvals</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
