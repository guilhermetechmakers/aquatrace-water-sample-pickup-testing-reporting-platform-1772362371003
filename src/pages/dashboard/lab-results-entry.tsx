import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Loader2,
  X,
  History,
  AlertTriangle,
  HelpCircle,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useResultBySampleId,
  useResultWithDetails,
  useCreateResult,
  useUpdateResult,
  useUploadAttachment,
  useRevertResult,
  useThresholds,
} from '@/hooks/useLabResultsEntry'
import { useRBAC } from '@/hooks/useRBAC'
import {
  parseNumericInput,
  validateResultAgainstThreshold,
  validateAttachment,
} from '@/lib/lab-results-validation'
import {
  SPC_UNITS,
  TC_UNITS,
  DETECTION_METHODS,
} from '@/types/lab-results-entry'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const MAX_ATTACHMENTS = 10

export function LabResultsEntryPage() {
  const { sampleId } = useParams<{ sampleId: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useRBAC()

  const { data: existingResult, isLoading: resultLoading } = useResultBySampleId(sampleId ?? null)
  const { data: details, isLoading: detailsLoading } = useResultWithDetails(existingResult?.id ?? null)
  const { data: threshold } = useThresholds(
    undefined,
    undefined
  )

  const createResult = useCreateResult()
  const updateResult = useUpdateResult()
  const uploadAttachment = useUploadAttachment()
  const revertResult = useRevertResult()

  const [spcValue, setSpcValue] = useState('')
  const [totalColiformValue, setTotalColiformValue] = useState('')
  const [spcUnit, setSpcUnit] = useState('CFU/mL')
  const [tcUnit, setTcUnit] = useState('CFU/100mL')
  const [method, setMethod] = useState('Standard Plate Count')
  const [note, setNote] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [revertVersion, setRevertVersion] = useState<number | null>(null)
  const [revertNote, setRevertNote] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const isEdit = Boolean(existingResult?.id)
  const resultId = existingResult?.id ?? null
  const versions = details?.versions ?? []
  const attachments = details?.attachments ?? []

  useEffect(() => {
    if (existingResult) {
      setSpcValue(existingResult.spcValue != null ? String(existingResult.spcValue) : '')
      setTotalColiformValue(existingResult.totalColiformValue != null ? String(existingResult.totalColiformValue) : '')
      setSpcUnit(existingResult.spcUnit ?? 'CFU/mL')
      setTcUnit(existingResult.totalColiformUnit ?? 'CFU/100mL')
      setMethod(existingResult.method ?? 'Standard Plate Count')
    }
  }, [existingResult?.id])

  const spcNum = parseNumericInput(spcValue)
  const tcNum = parseNumericInput(totalColiformValue)
  const validation = validateResultAgainstThreshold(
    spcNum,
    spcUnit,
    tcNum,
    tcUnit,
    threshold ?? null
  )

  const processFiles = (files: FileList | null) => {
    const fileList = files ? Array.from(files) : []
    const valid: File[] = []
    for (const f of fileList) {
      const err = validateAttachment(f)
      if (err) toast.error(err.message)
      else valid.push(f)
    }
    setPendingFiles((prev) => {
      const combined = [...prev, ...valid]
      return combined.slice(0, MAX_ATTACHMENTS)
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    e.target.value = ''
  }

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleSave = () => {
    const spc = parseNumericInput(spcValue)
    const tc = parseNumericInput(totalColiformValue)
    if (spc === null && tc === null) {
      toast.error('Enter at least SPC or Total Coliform')
      return
    }

    if (isEdit && resultId) {
      updateResult.mutate(
        {
          resultId,
          input: {
            spcValue: spc,
            spcUnit: spcUnit || null,
            totalColiformValue: tc,
            totalColiformUnit: tcUnit || null,
            method: method || null,
            note: note || null,
          },
        },
        {
          onSuccess: () => {
            toast.success('Results updated')
            setNote('')
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
        }
      )
    } else {
      createResult.mutate(
        {
          sampleId: sampleId ?? '',
          spcValue: spc,
          spcUnit: spcUnit || null,
          totalColiformValue: tc,
          totalColiformUnit: tcUnit || null,
          method: method || null,
        },
        {
          onSuccess: (data) => {
            toast.success('Results saved')
            if (pendingFiles.length > 0 && data.id) {
              pendingFiles.forEach((file) => {
                uploadAttachment.mutate({ resultId: data.id, file })
              })
              setPendingFiles([])
            }
            navigate('/dashboard/lab')
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
        }
      )
    }
  }

  const handleRevert = () => {
    if (!resultId || revertVersion == null) return
    revertResult.mutate(
      { resultId, toVersion: revertVersion, note: revertNote || null },
      {
        onSuccess: () => {
          toast.success('Reverted to previous version')
          setRevertVersion(null)
          setRevertNote('')
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Revert failed'),
      }
    )
  }

  const isLoading = resultLoading || (isEdit && detailsLoading)
  const isSaving = createResult.isPending || updateResult.isPending

  if (!hasPermission('lab_results', 'read') && !hasPermission('lab_results', 'create')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You do not have permission to enter lab results.</CardDescription>
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
          <h1 className="text-3xl font-bold tracking-tight">Lab Results Entry</h1>
          <p className="text-muted-foreground mt-1">
            Sample {sampleId?.slice(0, 8) ?? '—'} — SPC and Total Coliform
          </p>
        </div>
      </div>

      {validation.errors.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div className="space-y-1">
                {validation.errors.map((e, i) => (
                  <p key={i} className="text-sm">
                    {e.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                Enter SPC and Total Coliform values. Units and method are required for validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spc" className="flex items-center gap-1">
                    SPC (Standard Plate Count)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help" aria-label="Help">
                          <HelpCircle className="h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Standard Plate Count - colony forming units per mL or g</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="spc"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={spcValue}
                      onChange={(e) => setSpcValue(e.target.value)}
                      className={validation.errors.some((e) => e.field === 'SPC') ? 'border-destructive' : ''}
                    />
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm w-32"
                      value={spcUnit}
                      onChange={(e) => setSpcUnit(e.target.value)}
                    >
                      {SPC_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  {validation.errors.some((e) => e.field === 'spcUnit') && (
                    <p className="text-xs text-warning">{validation.errors.find((e) => e.field === 'spcUnit')?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tc" className="flex items-center gap-1">
                    Total Coliform
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground cursor-help" aria-label="Help">
                          <HelpCircle className="h-4 w-4" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total coliform count per 100mL or mL</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="tc"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={totalColiformValue}
                      onChange={(e) => setTotalColiformValue(e.target.value)}
                      className={validation.errors.some((e) => e.field === 'Total Coliform') ? 'border-destructive' : ''}
                    />
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm w-36"
                      value={tcUnit}
                      onChange={(e) => setTcUnit(e.target.value)}
                    >
                      {TC_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  {validation.errors.some((e) => e.field === 'totalColiformUnit') && (
                    <p className="text-xs text-warning">{validation.errors.find((e) => e.field === 'totalColiformUnit')?.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Detection Method</Label>
                <select
                  id="method"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {DETECTION_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="note">Change note (optional)</Label>
                  <Input
                    id="note"
                    placeholder="Describe changes..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Attachments</Label>
                <p className="text-xs text-muted-foreground">
                  PDF, CSV, XLSX, or images. Max 50MB per file. Drag and drop or click to add.
                </p>
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).querySelector('input')?.click()}
                  className={cn(
                    'flex flex-wrap gap-2 rounded-lg border-2 border-dashed p-4 transition-colors',
                    isDragging ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'
                  )}
                >
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.csv,.xlsx,.xls,image/*"
                      multiple
                      onChange={handleFileSelect}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-1" />
                        Add file
                      </span>
                    </Button>
                  </label>
                  {pendingFiles.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f.name}
                      <button type="button" onClick={() => removePendingFile(i)} aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {(attachments ?? []).map((a) => (
                    <Badge key={a.id} variant="outline">
                      {a.fileName}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEdit ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/lab">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {isEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Version History
                  </CardTitle>
                  <CardDescription>Current: v{existingResult?.version ?? 1}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(versions ?? []).map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          'flex items-center justify-between rounded border p-2 text-sm',
                          v.version === existingResult?.version && 'border-primary bg-primary/5'
                        )}
                      >
                        <span>v{v.version}</span>
                        <span className="text-muted-foreground text-xs">
                          {v.changedAt ? format(new Date(v.changedAt), 'PPp') : '—'}
                        </span>
                        {hasPermission('lab_results', 'execute') && v.version !== existingResult?.version && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRevertVersion(v.version)}
                          >
                            Revert
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {revertVersion != null && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <Label>Revert to v{revertVersion}</Label>
                      <Input
                        placeholder="Note (optional)"
                        value={revertNote}
                        onChange={(e) => setRevertNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleRevert} disabled={revertResult.isPending}>
                          Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRevertVersion(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {existingResult?.flags && existingResult.flags.length > 0 && (
              <Card className="border-warning/50">
                <CardHeader>
                  <CardTitle className="text-warning">Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {existingResult.flags.map((f) => (
                      <Badge key={f} variant="destructive">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
