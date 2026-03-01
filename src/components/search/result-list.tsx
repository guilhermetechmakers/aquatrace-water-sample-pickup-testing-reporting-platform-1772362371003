/**
 * Result List / Result Grid
 * Adaptable to Samples, Reports, Customers, Invoices
 * Quick actions: view, filter-by, export
 */

import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Droplets,
  FileText,
  Users,
  DollarSign,
  ExternalLink,
  Filter,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { SearchEntityType } from '@/types/search'

const ENTITY_CONFIG: Record<
  SearchEntityType,
  { icon: typeof Droplets; viewLabel: string }
> = {
  samples: { icon: Droplets, viewLabel: 'View' },
  reports: { icon: FileText, viewLabel: 'View' },
  customers: { icon: Users, viewLabel: 'View' },
  invoices: { icon: DollarSign, viewLabel: 'View' },
}

export interface ResultListProps {
  items: Record<string, unknown>[]
  entityType: SearchEntityType
  total: number
  page: number
  limit: number
  onPageChange?: (page: number) => void
  onFilterBy?: (item: Record<string, unknown>) => void
  onExport?: () => void
  isLoading?: boolean
  emptyMessage?: string
  className?: string
}

export function ResultList({
  items,
  entityType,
  total,
  page,
  limit,
  onPageChange,
  onFilterBy,
  onExport,
  isLoading = false,
  emptyMessage = 'No results found',
  className,
}: ResultListProps) {
  const list = Array.isArray(items) ? items : []
  const config = ENTITY_CONFIG[entityType] ?? ENTITY_CONFIG.samples
  const Icon = config.icon
  const totalPages = Math.ceil(total / limit) || 1

  const getHref = useCallback(
    (item: Record<string, unknown>) => {
      const id = (item.id as string) ?? ''
      switch (entityType) {
        case 'samples':
          return `/dashboard/pickups/${id}`
        case 'reports':
          return `/dashboard/reports`
        case 'customers':
          return `/dashboard/customers`
        case 'invoices':
          return `/dashboard/invoicing/${id}`
        default:
          return '#'
      }
    },
    [entityType]
  )

  const getTitle = useCallback(
    (item: Record<string, unknown>) => {
      switch (entityType) {
        case 'samples':
          return (
            (item.sampleId as string) ??
            (item.vialId as string) ??
            (item.id as string) ??
            ''
          )
        case 'reports':
          return (item.report_id as string) ?? (item.id as string) ?? ''
        case 'customers':
          return (item.name as string) ?? (item.email as string) ?? (item.id as string) ?? ''
        case 'invoices':
          return (item.invoice_id as string) ?? (item.id as string) ?? ''
        default:
          return (item.id as string) ?? ''
      }
    },
    [entityType]
  )

  const getSubtitle = useCallback(
    (item: Record<string, unknown>) => {
      switch (entityType) {
        case 'samples':
          return (item.location as string) ?? undefined
        case 'reports':
          return undefined
        case 'customers':
          return (item.email as string) ?? undefined
        case 'invoices':
          return (item.date as string) ?? undefined
        default:
          return undefined
      }
    },
    [entityType]
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-4 py-8', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-muted/50"
          />
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <Icon className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">No results found</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {list.map((item, idx) => {
        const id = (item.id as string) ?? `item-${idx}`
        const href = getHref(item)
        const title = getTitle(item)
        const subtitle = getSubtitle(item)
        const status = (item.status as string) ?? undefined
        const timestamp =
          (item.sample_timestamp as string) ??
          (item.updated_at as string) ??
          (item.created_at as string) ??
          undefined

        return (
          <div
            key={`${entityType}-${id}`}
            className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <Link to={href} className="min-w-0 flex-1 hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded">
              <p className="font-medium truncate">{title}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </Link>
            {status && (
              <Badge variant="secondary" className="shrink-0">
                {status}
              </Badge>
            )}
            {timestamp && (
              <span className="text-sm text-muted-foreground shrink-0">
                {format(new Date(timestamp), 'MMM d, yyyy')}
              </span>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to={href} aria-label={config.viewLabel}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              {onFilterBy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFilterBy(item)}
                  aria-label="Filter by this item"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
      {(total > limit || page > 1) && onPageChange && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {onExport && list.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      )}
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Showing {list.length} of {total} results
      </p>
    </div>
  )
}
