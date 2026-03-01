/**
 * ImportWizard - File upload, template hints, client-side validation, submit to backend
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileSpreadsheet, Download, Loader2 } from 'lucide-react'
import { useImportTemplate, useValidateImport, useCommitImport } from '@/hooks/useDataExportImport'
import { getImportTemplate, downloadTemplateCsv } from '@/api/data-export-import'
import { ImportPreviewPanel } from './import-preview-panel'
import type { DataImportType } from '@/types/data-export-import'
import { toast } from 'sonner'

const IMPORT_TYPES: { value: DataImportType; label: string }[] = [
  { value: 'samples', label: 'Samples' },
  { value: 'results', label: 'Lab Results' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'customers', label: 'Customers' },
]

export function ImportWizard() {
  const [dataType, setDataType] = useState<DataImportType>('samples')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{
    jobId: string
    previewRows: Array<{ rowIndex: number; valid: boolean; errors: string[]; data: Record<string, unknown> }>
    validCount: number
    invalidCount: number
    totalRows: number
    headers: string[]
  } | null>(null)

  const { data: template } = useImportTemplate(dataType)
  const validateMutation = useValidateImport()
  const commitMutation = useCommitImport()

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }
    setFile(f)
    setPreview(null)
  }, [])

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const t = await getImportTemplate(dataType)
      const headerRow = t.headerRow ?? (t.fields ?? []).map((f) => f.name).join(',')
      const exampleRow = t.exampleRow ?? (t.fields ?? []).map((f) => f.example).join(',')
      downloadTemplateCsv(headerRow, exampleRow, dataType)
      toast.success('Template downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download template')
    }
  }, [dataType])

  const handlePreview = useCallback(() => {
    if (!file) {
      toast.error('Select a file first')
      return
    }
    validateMutation.mutate(
      { file, type: dataType },
      {
        onSuccess: (data) => {
          setPreview({
            jobId: data.jobId ?? '',
            previewRows: data.previewRows ?? [],
            validCount: data.validCount ?? 0,
            invalidCount: data.invalidCount ?? 0,
            totalRows: data.totalRows ?? 0,
            headers: data.headers ?? [],
          })
          toast.success(`Preview: ${data.validCount} valid, ${data.invalidCount} invalid`)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Validation failed'),
      }
    )
  }, [file, dataType, validateMutation])

  const handleCommit = useCallback(() => {
    if (!file) return
    commitMutation.mutate(
      { file, type: dataType },
      {
        onSuccess: (data) => {
          toast.success(`Imported ${data.imported} rows${data.failed > 0 ? `, ${data.failed} failed` : ''}`)
          setFile(null)
          setPreview(null)
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Import failed'),
      }
    )
  }, [file, dataType, commitMutation])

  const handleCancel = useCallback(() => {
    setPreview(null)
  }, [])

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Historical Data
          </CardTitle>
          <CardDescription>
            Download a template, fill it with your data, then upload for validation and import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={(v) => { setDataType(v as DataImportType); setFile(null); setPreview(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
            {template && (
              <p className="text-xs text-muted-foreground mt-1">
                Required: {(template.fields ?? []).filter((f) => f.required).map((f) => f.name).join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>CSV File</Label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors hover:bg-muted/30">
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                id="csv-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Click to select CSV'}
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!file || validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Validate & Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <ImportPreviewPanel
          previewRows={preview.previewRows}
          validCount={preview.validCount}
          invalidCount={preview.invalidCount}
          totalRows={preview.totalRows}
          headers={preview.headers}
          onCommit={handleCommit}
          onCancel={handleCancel}
          isCommitting={commitMutation.isPending}
          canCommit={preview.validCount > 0}
        />
      )}
    </div>
  )
}
