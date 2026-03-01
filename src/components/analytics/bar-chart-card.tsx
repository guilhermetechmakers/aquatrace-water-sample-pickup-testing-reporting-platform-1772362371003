/**
 * BarChartCard - bar chart for test volumes, error rates
 */

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface BarChartDataPoint {
  name: string
  value: number
  fill?: string
}

const COLORS = [
  'rgb(var(--primary))',
  'rgb(var(--accent))',
  'rgb(var(--success))',
  'rgb(var(--warning))',
]

export interface BarChartCardProps {
  title: string
  description?: string
  data: BarChartDataPoint[] | Record<string, number>
  isLoading?: boolean
  className?: string
}

export function BarChartCard({
  title,
  description,
  data,
  isLoading = false,
  className,
}: BarChartCardProps) {
  const chartData: BarChartDataPoint[] = Array.isArray(data)
    ? data
    : Object.entries(data ?? {}).map(([name, value]) => ({ name, value }))
  const hasData = chartData.length > 0

  return (
    <Card className={cn('transition-all hover:shadow-card-hover', className)}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded" />
          </div>
        ) : !hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No data for selected period
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="value" name={title} radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
