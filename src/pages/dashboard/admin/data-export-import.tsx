/**
 * Data Export & Import (page_017)
 * Admin page for bulk export, CSV import, and audit logs
 */

import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileDown, FileSpreadsheet, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessControlWrap, ExportDashboard, ImportWizard } from '@/components/data-export-import'
import { useRBAC } from '@/hooks/useRBAC'
import { useAuditLogs } from '@/hooks/useDataExportImport'
import { format, subDays } from 'date-fns'

export function DataExportImportPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') ?? 'export'
  const typeParam = searchParams.get('type') ?? ''
  const [activeTab, setActiveTab] = useState(tabParam)
  const [auditFrom, setAuditFrom] = useState(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [auditTo, setAuditTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const { hasPermission } = useRBAC()
  const canExport = hasPermission('data_export_import', 'execute') || hasPermission('data_export_import', 'read')
  const canImport = hasPermission('data_export_import', 'execute') || hasPermission('data_export_import', 'create')
  const canAudit = hasPermission('data_export_import', 'read')

  const { data: auditData, isLoading: auditLoading } = useAuditLogs({
    from: auditFrom,
    to: auditTo,
    page: 1,
    pageSize: 50,
  })
  const auditLogs = auditData?.data ?? []

  useEffect(() => {
    if (['export', 'import', 'audit'].includes(tabParam)) setActiveTab(tabParam)
  }, [tabParam])

  return (
    <AccessControlWrap>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/admin" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight mt-2">
              Data Export & Import
            </h1>
            <p className="mt-1 text-muted-foreground">
              Export current datasets, import historical data via CSV, and view audit logs
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="export" className="flex items-center gap-2" disabled={!canExport}>
              <FileDown className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2" disabled={!canImport}>
              <FileSpreadsheet className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2" disabled={!canAudit}>
              <FileCheck className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-6">
            {canExport ? (
              <ExportDashboard defaultDataType={typeParam as 'samples' | 'results' | 'invoices' | 'all' | ''} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  You do not have permission to export data.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            {canImport ? (
              <ImportWizard />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  You do not have permission to import data.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>
                  Export and import actions are logged for compliance
                </CardDescription>
                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={auditFrom}
                      onChange={(e) => setAuditFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      type="date"
                      value={auditTo}
                      onChange={(e) => setAuditTo(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    No audit entries in this date range
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Data Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(auditLogs ?? []).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(log.created_at), 'PPp')}
                            </TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>{log.data_type}</TableCell>
                            <TableCell>
                              <span
                                className={`text-xs font-medium ${
                                  log.status === 'success'
                                    ? 'text-success'
                                    : log.status === 'failed'
                                      ? 'text-destructive'
                                      : 'text-warning'
                                }`}
                              >
                                {log.status}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">
                              {log.metadata && typeof log.metadata === 'object'
                                ? JSON.stringify(log.metadata)
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AccessControlWrap>
  )
}
