import { CheckSquare, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const mockApprovals = [
  { id: 'SMP-2024-001', site: 'Building A', submitted: '1 hr ago', overdue: false },
  { id: 'SMP-2024-005', site: 'Building E', submitted: '3 hrs ago', overdue: true },
]

export function ApprovalsPage() {
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
            <Badge variant="secondary">{mockApprovals.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockApprovals.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium">{s.id}</p>
                    {s.overdue && (
                      <Badge variant="destructive">Overdue</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.site} · Submitted {s.submitted}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Request Changes
                  </Button>
                  <Button size="sm">
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-4 w-full">
            Batch Approve Selected
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
