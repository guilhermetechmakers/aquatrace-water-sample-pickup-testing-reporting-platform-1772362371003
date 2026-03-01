/**
 * ARDashboard - Aging charts, reminders schedule, export actions, reconciliation status
 */

import { TrendingUp, TrendingDown, DollarSign, FileDown, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ARAgingSummary } from '@/types/billing'

export interface ARDashboardProps {
  summary?: ARAgingSummary | null
  isLoading?: boolean
  onExportCSV?: () => void
  onExportPDF?: () => void
  onScheduleReminders?: () => void
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const BUCKET_COLORS = [
  'rgb(var(--success))',
  'rgb(var(--accent))',
  'rgb(var(--warning))',
  'rgb(var(--destructive))',
  'rgb(var(--destructive))',
  'rgb(var(--destructive))',
]

export function ARDashboard({
  summary,
  isLoading = false,
  onExportCSV,
  onExportPDF,
  onScheduleReminders,
}: ARDashboardProps) {
  const s = summary ?? {
    totalOutstanding: 0,
    totalOverdue: 0,
    paidThisMonth: 0,
    buckets: { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 },
    counts: { current: 0, days7: 0, days14: 0, days30: 0, days60: 0, days90Plus: 0 },
  }

  const chartData = [
    { name: 'Current', amount: s.buckets?.current ?? 0, fill: BUCKET_COLORS[0] },
    { name: '1-7 days', amount: s.buckets?.days7 ?? 0, fill: BUCKET_COLORS[1] },
    { name: '8-14 days', amount: s.buckets?.days14 ?? 0, fill: BUCKET_COLORS[2] },
    { name: '15-30 days', amount: s.buckets?.days30 ?? 0, fill: BUCKET_COLORS[3] },
    { name: '31-60 days', amount: s.buckets?.days60 ?? 0, fill: BUCKET_COLORS[4] },
    { name: '90+ days', amount: s.buckets?.days90Plus ?? 0, fill: BUCKET_COLORS[5] },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64 col-span-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(s.totalOutstanding ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(s.totalOverdue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-success/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(s.paidThisMonth ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>AR Aging</CardTitle>
              <CardDescription>
                Outstanding balances by age bucket
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {onExportCSV && (
                <Button variant="outline" size="sm" onClick={onExportCSV}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
              {onExportPDF && (
                <Button variant="outline" size="sm" onClick={onExportPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              )}
              {onScheduleReminders && (
                <Button variant="outline" size="sm" onClick={onScheduleReminders}>
                  <Bell className="h-4 w-4 mr-2" />
                  Schedule Reminders
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {(chartData ?? []).map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
