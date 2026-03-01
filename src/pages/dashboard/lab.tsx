import { useState } from 'react'
import { FlaskConical, Upload, Search, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePickups } from '@/hooks/usePickups'
import { useLabResults, useCreateLabResult } from '@/hooks/useLabResults'
import { useRBAC } from '@/hooks/useRBAC'
import { format } from 'date-fns'

export function LabQueuePage() {
  const { hasPermission } = useRBAC()
  const { data: pickups = [], isLoading: pickupsLoading } = usePickups()
  const { data: labResults = [] } = useLabResults()
  const createLabResult = useCreateLabResult()

  const [search, setSearch] = useState('')
  const [selectedPickup, setSelectedPickup] = useState<{ id: string; location: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [spc, setSpc] = useState('')
  const [totalColiform, setTotalColiform] = useState('')

  const pickupsWithResults = (pickups ?? []).filter((p) => p.status === 'completed')
  const pickupsNeedingResults = pickupsWithResults.filter(
    (p) => !(labResults ?? []).some((lr) => lr.pickup_id === p.id)
  )
  const filteredQueue = search.trim()
    ? pickupsNeedingResults.filter(
        (p) =>
          p.location.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      )
    : pickupsNeedingResults

  const handleEnterResults = (p: { id: string; location: string }) => {
    setSelectedPickup(p)
    setSpc('')
    setTotalColiform('')
    setDialogOpen(true)
  }

  const handleSaveResults = () => {
    if (!selectedPickup) return
    const spcNum = parseFloat(spc)
    const coliformNum = parseFloat(totalColiform)
    if (isNaN(spcNum) || isNaN(coliformNum)) {
      toast.error('Enter valid SPC and Total Coliform values')
      return
    }
    createLabResult.mutate(
      {
        pickup_id: selectedPickup.id,
        spc: spcNum,
        total_coliform: coliformNum,
      },
      {
        onSuccess: () => {
          toast.success('Results saved')
          setDialogOpen(false)
          setSelectedPickup(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      }
    )
  }

  const loading = pickupsLoading

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
              <Input
                placeholder="Search samples..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                {(filteredQueue ?? []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-mono font-medium text-sm">{s.id.slice(0, 12)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {s.location} · {s.completed_at ? format(new Date(s.completed_at), 'PPp') : '—'}
                      </p>
                    </div>
                    {hasPermission('lab_results', 'create') && (
                      <Button size="sm" onClick={() => handleEnterResults({ id: s.id, location: s.location })}>
                        Enter Results
                      </Button>
                    )}
                  </div>
                ))}
                {(filteredQueue ?? []).length === 0 && (
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
              <span className="font-semibold">{filteredQueue.length}</span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Lab Results</DialogTitle>
            <DialogDescription>
              SPC and Total Coliform for {selectedPickup?.location}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="spc">SPC (Standard Plate Count)</Label>
              <Input
                id="spc"
                type="number"
                step="0.1"
                placeholder="0"
                value={spc}
                onChange={(e) => setSpc(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coliform">Total Coliform</Label>
              <Input
                id="coliform"
                type="number"
                step="0.1"
                placeholder="0"
                value={totalColiform}
                onChange={(e) => setTotalColiform(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveResults} disabled={createLabResult.isPending}>
              {createLabResult.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
