import { FlaskConical, Upload, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const mockQueue = [
  { id: 'SMP-2024-002', site: 'Building B', arrived: '2 hrs ago' },
  { id: 'SMP-2024-004', site: 'Building D', arrived: '4 hrs ago' },
]

export function LabQueuePage() {
  const loading = false

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Queue</h1>
          <p className="text-muted-foreground mt-1">
            Process and enter lab test results
          </p>
        </div>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle>New Arrivals</CardTitle>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search samples..." className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {mockQueue.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-mono font-medium">{s.id}</p>
                      <p className="text-sm text-muted-foreground">{s.site} · Arrived {s.arrived}</p>
                    </div>
                    <Button size="sm">Enter Results</Button>
                  </div>
                ))}
                {mockQueue.length === 0 && (
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">In Queue</span>
              <span className="font-semibold">{mockQueue.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processed Today</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg. Turnaround</span>
              <span className="font-semibold">4.2 hrs</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
