/**
 * ImportPreviewPanel - Displays rows marked valid/invalid with inline corrections
 * Supports paging of large previews
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImportPreviewRow } from '@/types/data-export-import'

const PAGE_SIZE = 10

export interface ImportPreviewPanelProps {
  previewRows: ImportPreviewRow[]
  validCount: number
  invalidCount: number
  totalRows: number
  headers?: string[]
  onCommit?: () => void
  onCancel?: () => void
  isCommitting?: boolean
  canCommit?: boolean
}

export function ImportPreviewPanel({
  previewRows,
  validCount,
  invalidCount,
  totalRows,
  headers = [],
  onCommit,
  onCancel,
  isCommitting = false,
  canCommit = true,
}: ImportPreviewPanelProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil((previewRows ?? []).length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const pageRows = (previewRows ?? []).slice(start, start + PAGE_SIZE)

  const displayHeaders = headers.length > 0 ? headers : (pageRows[0] ? Object.keys(pageRows[0].data ?? {}) : [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Preview</CardTitle>
        <CardDescription>
          {validCount} valid, {invalidCount} invalid of {totalRows} total rows.
          {invalidCount > 0 && ' Invalid rows will be skipped on commit.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Row</TableHead>
                <TableHead className="w-20">Status</TableHead>
                {displayHeaders.slice(0, 6).map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pageRows ?? []).map((r) => (
                <TableRow
                  key={r.rowIndex}
                  className={cn(!r.valid && 'bg-destructive/5')}
                >
                  <TableCell className="font-mono text-xs">{r.rowIndex}</TableCell>
                  <TableCell>
                    {r.valid ? (
                      <span className="flex items-center gap-1 text-success text-xs">
                        <CheckCircle className="h-3 w-3" />
                        OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive text-xs">
                        <XCircle className="h-3 w-3" />
                        Invalid
                      </span>
                    )}
                  </TableCell>
                  {displayHeaders.slice(0, 6).map((h) => (
                    <TableCell key={h} className="max-w-[120px] truncate">
                      {String((r.data ?? {})[h] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell className="text-destructive text-xs max-w-[200px]">
                    {(r.errors ?? []).join('; ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isCommitting}>
              Cancel
            </Button>
          )}
          {onCommit && (
            <Button
              onClick={onCommit}
              disabled={!canCommit || isCommitting || validCount === 0}
            >
              {isCommitting ? 'Importing...' : `Commit ${validCount} Valid Rows`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
