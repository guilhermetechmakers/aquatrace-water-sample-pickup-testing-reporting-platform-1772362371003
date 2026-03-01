/**
 * DonutChart - pie/donut chart for distribution (Recharts)
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface DonutChartDataPoint {
  name: string
  value: number
  fill?: string
}

const COLORS = [
  'rgb(var(--primary))',
  'rgb(var(--accent))',
  'rgb(var(--success))',
  'rgb(var(--warning))',
  'rgb(var(--muted-foreground))',
]

export interface DonutChartProps {
  title: string
  description?: string
  data: DonutChartDataPoint[] | Record<string, number>
  isLoading?: boolean
  innerRadius?: number
  className?: string
}

export function DonutChart({
  title,
  description,
  data,
  isLoading = false,
  innerRadius = 60,
  className,
}: DonutChartProps) {
  const chartData: DonutChartDataPoint[] = Array.isArray(data)
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
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {(chartData ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} (${chartData.reduce((s, d) => s + d.value, 0) > 0
                      ? Math.round((value / chartData.reduce((s, d) => s + d.value, 0)) * 100)
                      : 0}%)`,
                    name,
                  ]}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
