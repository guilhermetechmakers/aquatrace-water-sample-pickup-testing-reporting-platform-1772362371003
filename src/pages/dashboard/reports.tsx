import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchReportsList } from '@/api/reports'
import { format } from 'date-fns'

export function ReportsPage() {
  const [search, setSearch] = useState('')
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', 'list'],
    queryFn: () => fetchReportsList(),
  })

  const filteredReports = useMemo(() => {
    const list = Array.isArray(reports) ? reports : []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (r) =>
        r.reportId?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q)
    )
  }, [reports, search])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            View and distribute PDF reports
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/reports/distribution">
            Distribution
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50 sticky top-0">
                    <th className="h-12 px-4 text-left align-middle font-medium">Report ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Customer</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Version</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredReports ?? []).map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono text-sm">{r.reportId ?? r.id?.slice(0, 8)}</td>
                      <td className="p-4">{r.customerName ?? '—'}</td>
                      <td className="p-4">v{r.currentVersion ?? 1}</td>
                      <td className="p-4">
                        <Badge variant={r.status === 'distributed' ? 'default' : 'secondary'}>
                          {r.status ?? 'draft'}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {r.createdAt ? format(new Date(r.createdAt), 'PP') : '—'}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        {r.approvalId && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/dashboard/approvals/${r.approvalId}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(filteredReports ?? []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports yet</p>
                  <p className="text-sm mt-1">
                    Reports are generated when lab managers approve results.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
