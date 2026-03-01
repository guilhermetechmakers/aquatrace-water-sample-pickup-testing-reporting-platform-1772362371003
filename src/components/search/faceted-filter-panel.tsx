/**
 * Faceted Filters panel
 * Date range, customer, site, status with clear-all
 */

import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { SearchFilters } from '@/types/search'
import { cn } from '@/lib/utils'

export interface FacetedFilterPanelProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClearAll?: () => void
  customers?: Array<{ id: string; name: string }>
  sites?: Array<{ id: string; name: string }>
  statusOptions?: Array<{ value: string; label: string }>
  entityType?: 'samples' | 'reports' | 'customers' | 'invoices'
  defaultOpen?: boolean
  className?: string
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Synced', label: 'Synced' },
  { value: 'InLab', label: 'In Lab' },
  { value: 'LabApproved', label: 'Lab Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Archived', label: 'Archived' },
]

export function FacetedFilterPanel({
  filters,
  onChange,
  onClearAll,
  customers = [],
  sites = [],
  statusOptions = DEFAULT_STATUS_OPTIONS,
  entityType = 'samples',
  defaultOpen = false,
  className,
}: FacetedFilterPanelProps) {
  const hasActiveFilters =
    (filters.startDate ?? '') !== '' ||
    (filters.endDate ?? '') !== '' ||
    (filters.status ?? '') !== '' ||
    (Array.isArray(filters.status) && filters.status.length > 0) ||
    (filters.customerId ?? '') !== '' ||
    (filters.siteId ?? '') !== ''

  const updateFilter = (key: keyof SearchFilters, value: string | string[] | undefined) => {
    onChange({ ...filters, [key]: value })
  }

  const handleClearAll = () => {
    onChange({})
    onClearAll?.()
  }

  const customerList = Array.isArray(customers) ? customers : []
  const siteList = Array.isArray(sites) ? sites : []

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                Active
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      <CollapsibleContent>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="filter-start-date" className="text-xs">
              From date
            </Label>
            <Input
              id="filter-start-date"
              type="date"
              value={filters.startDate ?? ''}
              onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-end-date" className="text-xs">
              To date
            </Label>
            <Input
              id="filter-end-date"
              type="date"
              value={filters.endDate ?? ''}
              onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
            />
          </div>
          {(entityType === 'samples' || entityType === 'reports' || entityType === 'invoices') && (
            <div className="space-y-2">
              <Label htmlFor="filter-status" className="text-xs">
                Status
              </Label>
              <select
                id="filter-status"
                value={
                  Array.isArray(filters.status)
                    ? filters.status[0] ?? 'all'
                    : (filters.status as string) ?? 'all'
                }
                onChange={(e) => {
                  const v = e.target.value
                  updateFilter('status', v === 'all' ? undefined : v)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {(entityType === 'samples' || entityType === 'reports' || entityType === 'invoices') &&
            customerList.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="filter-customer" className="text-xs">
                  Customer
                </Label>
                <select
                  id="filter-customer"
                  value={filters.customerId ?? ''}
                  onChange={(e) => updateFilter('customerId', e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All customers</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          {entityType === 'samples' && siteList.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="filter-site" className="text-xs">
                Site
              </Label>
              <select
                id="filter-site"
                value={filters.siteId ?? ''}
                onChange={(e) => updateFilter('siteId', e.target.value || undefined)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All sites</option>
                {siteList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
