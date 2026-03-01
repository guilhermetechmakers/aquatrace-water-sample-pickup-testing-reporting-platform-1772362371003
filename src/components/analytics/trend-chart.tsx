/**
 * TrendChart - time-series line chart (Recharts)
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TrendDataPoint } from '@/types/analytics'

export interface TrendChartProps {
  title: string
  description?: string
  data: TrendDataPoint[]
  dataKey?: string
  isLoading?: boolean
  unit?: string
  variant?: 'line' | 'area'
  className?: string
}

export function TrendChart({
  title,
  description,
  data,
  dataKey = 'value',
  isLoading = false,
  unit = '',
  variant = 'area',
  className,
}: TrendChartProps) {
  const chartData = Array.isArray(data) ? data : []
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
              {variant === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => [`${value}${unit}`, title]}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke="rgb(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    name={title}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => [`${value}${unit}`, title]}
                    contentStyle={{ borderRadius: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="rgb(var(--primary))"
                    strokeWidth={2}
                    name={title}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
