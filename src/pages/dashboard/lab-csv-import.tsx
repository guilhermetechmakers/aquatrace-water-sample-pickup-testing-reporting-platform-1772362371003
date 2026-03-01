import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCSVImportPreview,
  useCSVImportJob,
  useCSVImportJobs,
} from '@/hooks/useLabResultsEntry'
import { useRBAC } from '@/hooks/useRBAC'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const CSV_FIELD_OPTIONS = [
  { value: 'sampleId', label: 'Sample ID' },
  { value: 'spcValue', label: 'SPC Value' },
  { value: 'spcUnit', label: 'SPC Unit' },
  { value: 'totalColiformValue', label: 'Total Coliform Value' },
  { value: 'totalColiformUnit', label: 'Total Coliform Unit' },
  { value: 'method', label: 'Detection Method' },
] as const

export function LabCSVImportPage() {
  const { hasPermission } = useRBAC()
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({
    sampleId: '',
    spcValue: '',
    spcUnit: '',
    totalColiformValue: '',
    totalColiformUnit: '',
    method: '',
  })

  const previewMutation = useCSVImportPreview()
  const importMutation = useCSVImportJob()
  const { data: jobs = [], isLoading: jobsLoading } = useCSVImportJobs()

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      const headers = (lines[0] ?? '').split(',').map((h) => h.trim())
      setCsvHeaders(headers)
      setMappings((prev) => {
        const next = { ...prev }
        headers.forEach((h) => {
          if (!Object.values(next).includes(h)) {
            const match = CSV_FIELD_OPTIONS.find(
              (o) => h.toLowerCase().includes(o.value.toLowerCase()) || o.value.toLowerCase().includes(h.toLowerCase().slice(0, 4))
            )
            if (match) next[match.value] = h
          }
        })
        return next
      })
    }
    reader.readAsText(f)
  }, [])

  const handlePreview = () => {
    if (!file) {
      toast.error('Select a file first')
      return
    }
    previewMutation.mutate(
      { file, mappings },
      {
        onSuccess: (data) => {
          toast.success(`Preview: ${data.previewRows.length} rows`)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Preview failed'),
      }
    )
  }

  const handleImport = () => {
    if (!file) {
      toast.error('Select a file first')
      return
    }
    if (!mappings.sampleId) {
      toast.error('Map Sample ID column')
      return
    }
    importMutation.mutate(
      { file, mappings },
      {
        onSuccess: (data) => {
          toast.success(`Imported ${data.successRows} of ${data.totalRows} rows`)
          setFile(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Import failed'),
      }
    )
  }

  const previewRows = previewMutation.data?.previewRows ?? []

  if (!hasPermission('lab_results', 'create')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to import lab results.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/lab">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CSV Import</h1>
          <p className="text-muted-foreground mt-1">
            Batch import SPC and Total Coliform results from CSV
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload & Map
            </CardTitle>
            <CardDescription>
              Upload a CSV file and map columns to fields. Sample ID is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">CSV File</label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  id="csv-upload"
                  onChange={handleFileChange}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : 'Click to select CSV'}
                  </p>
                </label>
              </div>
            </div>

            {csvHeaders.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Column Mapping</h4>
                {CSV_FIELD_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <label className="w-40 text-sm">{opt.label}</label>
                    <select
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={mappings[opt.value] ?? ''}
                      onChange={(e) =>
                        setMappings((m) => ({ ...m, [opt.value]: e.target.value }))
                      }
                    >
                      <option value="">—</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePreview} disabled={!file || previewMutation.isPending}>
                {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || !mappings.sampleId || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Import'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              First 10 rows — check mapping before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewMutation.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : previewRows.length > 0 ? (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Row</th>
                      <th className="text-left py-2 px-2">Sample ID</th>
                      <th className="text-left py-2 px-2">SPC</th>
                      <th className="text-left py-2 px-2">TC</th>
                      <th className="text-left py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r) => (
                      <tr key={r.rowIndex} className={cn('border-b', r.errors.length > 0 && 'bg-destructive/5')}>
                        <td className="py-2 px-2">{r.rowIndex}</td>
                        <td className="py-2 px-2">{r.sampleId || '—'}</td>
                        <td className="py-2 px-2">{r.spcValue ?? '—'}</td>
                        <td className="py-2 px-2">{r.totalColiformValue ?? '—'}</td>
                        <td className="py-2 px-2">
                          {r.errors.length > 0 ? (
                            <span className="text-destructive text-xs flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {r.errors[0]}
                            </span>
                          ) : (
                            <span className="text-success text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Upload a file and click Preview</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Recent CSV import jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-2">
              {(jobs ?? []).slice(0, 10).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(j.createdAt), 'PPp')}</span>
                    <span className="text-muted-foreground">
                      {j.successRows}/{j.totalRows} rows
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      j.status === 'completed' ? 'text-success' : j.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {j.status}
                  </span>
                </div>
              ))}
              {(jobs ?? []).length === 0 && (
                <p className="text-muted-foreground text-sm">No import history</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
