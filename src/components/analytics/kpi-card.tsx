/**
 * KPI Card - metric display with gradient accent, trend indicator, icon
 */

import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface KPICardProps {
  title: string
  value: string | number
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  iconColor?: string
  gradient?: boolean
  className?: string
}

export function KPICard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
  iconColor = 'text-primary',
  gradient = false,
  className,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200 hover:shadow-card-hover',
        gradient && 'bg-gradient-to-br from-primary/10 to-accent/10',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend != null && (
          <p
            className={cn(
              'text-xs mt-1',
              trendUp === true
                ? 'text-success'
                : trendUp === false
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            )}
          >
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
