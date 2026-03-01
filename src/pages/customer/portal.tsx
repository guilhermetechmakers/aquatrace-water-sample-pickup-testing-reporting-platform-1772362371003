import { useState } from 'react'
import { FileText, Download, Bell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useReports } from '@/hooks/useReports'
import type { ReportWithMeta } from '@/api/reports'
import { format } from 'date-fns'

export function CustomerPortalPage() {
  const { data: reports = [], isLoading } = useReports()
  const [search, setSearch] = useState('')

  const filteredReports = search.trim()
    ? (reports ?? []).filter(
        (r: ReportWithMeta) =>
          r.pickup?.location?.toLowerCase().includes(search.toLowerCase()) ||
          r.id.toLowerCase().includes(search.toLowerCase())
      )
    : (reports ?? [])

  const handleDownload = (report: (typeof reports)[0]) => {
    if (report.pdf_link) {
      window.open(report.pdf_link, '_blank')
    } else {
      // Stub: PDF not yet generated
      console.info('PDF not available for', report.id)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View and download your water test reports
          </p>
        </div>
        <Button variant="outline">
          <Bell className="h-4 w-4 mr-2" />
          Notifications
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
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (filteredReports ?? []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports available for your account</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(filteredReports ?? []).map((r: ReportWithMeta) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-mono font-medium text-sm">{r.id.slice(0, 12)}...</p>
                      <p className="text-sm text-muted-foreground">
                        {r.pickup?.location ?? 'Unknown'} · {r.created_at ? format(new Date(r.created_at), 'PP') : '—'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(r)}
                    disabled={!r.pdf_link}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
