import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FlaskConical,
  Search,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  useQueuedSamples,
  useCreateResult,
  useCSVImportJobs,
} from '@/hooks/useLabResultsEntry'
import { useSites } from '@/hooks/useSites'
import { useRBAC } from '@/hooks/useRBAC'
import { format } from 'date-fns'
import { parseNumericInput } from '@/lib/lab-results-validation'
import type { LabSampleWithResult } from '@/api/lab-results-entry'

type SortColumn =
  | 'sampleId'
  | 'customer'
  | 'site'
  | 'collectionDate'
  | 'spcResult'
  | 'coliformResult'
  | 'entryStatus'
  | 'lastModified'
type SortDir = 'asc' | 'desc'

function getEntryStatusBadge(status: LabSampleWithResult['entryStatus']) {
  const variants: Record<LabSampleWithResult['entryStatus'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    not_entered: { label: 'Not Entered', variant: 'secondary' },
    pending: { label: 'Pending', variant: 'secondary' },
    draft: { label: 'Draft', variant: 'outline' },
    validated: { label: 'Validated', variant: 'default' },
    flagged: { label: 'Flagged', variant: 'destructive' },
    approved: { label: 'Approved', variant: 'default' },
  }
  const v = variants[status] ?? variants.pending
  return <Badge variant={v.variant}>{v.label}</Badge>
}

export function LabQueuePage() {
  const navigate = useNavigate()
  const { hasPermission } = useRBAC()
  const [filters, setFilters] = useState<{
    siteId?: string
    status?: string
    dueDateFrom?: string
    dueDateTo?: string
  }>({})
  const { data: queuedData, isLoading } = useQueuedSamples(filters)
  const { data: sites = [] } = useSites()
  const createResult = useCreateResult()
  const { data: csvJobs = [] } = useCSVImportJobs()

  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('collectionDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [quickEntrySample, setQuickEntrySample] = useState<LabSampleWithResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [spc, setSpc] = useState('')
  const [totalColiform, setTotalColiform] = useState('')
  const [spcUnit, setSpcUnit] = useState('CFU/mL')
  const [tcUnit, setTcUnit] = useState('CFU/100mL')
  const [method, setMethod] = useState('Standard Plate Count')

  const samples = queuedData?.data ?? []
  const queueCount = queuedData?.count ?? 0

  const filtered = useMemo(() => {
    let list = [...samples]
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (x) =>
          x.id.toLowerCase().includes(s) ||
          (x.location ?? '').toLowerCase().includes(s) ||
          (x.customerName ?? '').toLowerCase().includes(s) ||
          (x.siteName ?? '').toLowerCase().includes(s)
      )
    }
    return list
  }, [samples, search])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case 'sampleId':
          cmp = (a.id ?? '').localeCompare(b.id ?? '')
          break
        case 'customer':
          cmp = (a.customerName ?? '').localeCompare(b.customerName ?? '')
          break
        case 'site':
          cmp = (a.siteName ?? a.location ?? '').localeCompare(b.siteName ?? b.location ?? '')
          break
        case 'collectionDate':
          cmp = new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime()
          break
        case 'spcResult':
          cmp = (a.spcResult ?? -1) - (b.spcResult ?? -1)
          break
        case 'coliformResult':
          cmp = (a.coliformResult ?? -1) - (b.coliformResult ?? -1)
          break
        case 'entryStatus':
          cmp = (a.entryStatus ?? '').localeCompare(b.entryStatus ?? '')
          break
        case 'lastModified':
          cmp = new Date(a.lastModified ?? 0).getTime() - new Date(b.lastModified ?? 0).getTime()
          break
        default:
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filtered, sortColumn, sortDir])

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else setSortColumn(col)
  }

  const SortIcon = ({ col }: { col: SortColumn }) =>
    sortColumn === col ? (
      sortDir === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : null

  const handleOpenEntryPage = (sample: LabSampleWithResult) => {
    navigate(`/dashboard/lab/entry/${sample.id}`)
  }

  const handleOpenQuickEntry = (sample: LabSampleWithResult) => {
    setQuickEntrySample(sample)
    setSpc('')
    setTotalColiform('')
    setSpcUnit('CFU/mL')
    setTcUnit('CFU/100mL')
    setMethod('Standard Plate Count')
    setDialogOpen(true)
  }

  const handleSaveQuickResults = () => {
    if (!quickEntrySample) return
    const spcNum = parseNumericInput(spc)
    const tcNum = parseNumericInput(totalColiform)
    if (spcNum === null && tcNum === null) {
      toast.error('Enter at least SPC or Total Coliform')
      return
    }

    createResult.mutate(
      {
        sampleId: quickEntrySample.id,
        spcValue: spcNum,
        spcUnit: spcUnit || null,
        totalColiformValue: tcNum,
        totalColiformUnit: tcUnit || null,
        method: method || null,
      },
      {
        onSuccess: () => {
          toast.success('Results saved')
          setDialogOpen(false)
          setQuickEntrySample(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
      }
    )
  }

  const processedToday = csvJobs.filter((j) => {
    const d = new Date(j.createdAt)
    const today = new Date()
    return d.toDateString() === today.toDateString() && j.status === 'completed'
  }).reduce((a, j) => a + j.successRows, 0)

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
            Samples queued for lab testing — enter SPC and Total Coliform results
          </p>
        </div>
        {hasPermission('lab_results', 'create') && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard/lab/import">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV Import
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <CardTitle>Sample Queue</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by sample ID, site, customer..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.siteId ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, siteId: e.target.value || undefined }))}
              >
                <option value="">All sites</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('sampleId')}
                        >
                          Sample ID
                          <SortIcon col="sampleId" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('site')}
                        >
                          Site
                          <SortIcon col="site" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('collectionDate')}
                        >
                          Collection Date
                          <SortIcon col="collectionDate" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('spcResult')}
                        >
                          SPC Result
                          <SortIcon col="spcResult" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('coliformResult')}
                        >
                          Coliform Result
                          <SortIcon col="coliformResult" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('entryStatus')}
                        >
                          Entry Status
                          <SortIcon col="entryStatus" />
                        </button>
                      </th>
                      <th className="text-left py-3 px-2">
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                          onClick={() => handleSort('lastModified')}
                        >
                          Last Modified
                          <SortIcon col="lastModified" />
                        </button>
                      </th>
                      <th className="text-right py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sorted ?? []).map((s) => (
                      <tr
                        key={s.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-2 font-mono text-xs">{s.id.slice(0, 8)}...</td>
                        <td className="py-3 px-2">{s.location ?? s.siteName ?? '—'}</td>
                        <td className="py-3 px-2">
                          {s.collectionDate ? format(new Date(s.collectionDate), 'PP') : '—'}
                        </td>
                        <td className="py-3 px-2">{s.spcResult ?? '—'}</td>
                        <td className="py-3 px-2">{s.coliformResult ?? '—'}</td>
                        <td className="py-3 px-2">{getEntryStatusBadge(s.entryStatus)}</td>
                        <td className="py-3 px-2">{s.lastModified ? format(new Date(s.lastModified), 'PPp') : '—'}</td>
                        <td className="py-3 px-2 text-right">
                          {hasPermission('lab_results', 'create') && (
                            <div className="flex justify-end gap-1">
                              {!s.resultId && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenQuickEntry(s)}
                                  title="Quick enter"
                                >
                                  Quick
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEntryPage(s)}
                                className="gap-1"
                              >
                                {s.resultId ? 'Edit' : 'Enter'}
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(sorted ?? []).length === 0 && (
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
              <span className="font-semibold">{queueCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processed Today</span>
              <span className="font-semibold">{processedToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending Entry</span>
              <span className="font-semibold">
                {(samples ?? []).filter((x) => x.entryStatus === 'pending').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Enter Results</DialogTitle>
            <DialogDescription>
              {quickEntrySample?.location ?? 'Sample'} — SPC and Total Coliform
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
            <Button
              onClick={() => {
                if (quickEntrySample) handleOpenEntryPage(quickEntrySample)
                setDialogOpen(false)
              }}
              variant="outline"
            >
              Full Entry
            </Button>
            <Button onClick={handleSaveQuickResults} disabled={createResult.isPending}>
              {createResult.isPending ? (
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
