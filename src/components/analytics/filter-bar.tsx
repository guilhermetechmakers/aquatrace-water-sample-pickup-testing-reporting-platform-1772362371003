/**
 * FilterBar - date range, customer, lab, technician, test type filters
 */

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnalyticsFilters } from '@/types/analytics'

export interface FilterBarProps {
  filters: AnalyticsFilters
  onFiltersChange: (f: AnalyticsFilters) => void
  onApply?: () => void
  className?: string
}

export function FilterBar({
  filters,
  onFiltersChange,
  onApply,
  className,
}: FilterBarProps) {
  const handleChange = (key: keyof AnalyticsFilters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-start">Start</Label>
        <Input
          id="filter-start"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(e) => handleChange('startDate', e.target.value || undefined)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-end">End</Label>
        <Input
          id="filter-end"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(e) => handleChange('endDate', e.target.value || undefined)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-customer">Customer</Label>
        <Input
          id="filter-customer"
          placeholder="Customer ID"
          value={filters.customerId ?? ''}
          onChange={(e) => handleChange('customerId', e.target.value || undefined)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-technician">Technician</Label>
        <Input
          id="filter-technician"
          placeholder="Technician ID"
          value={filters.technicianId ?? ''}
          onChange={(e) => handleChange('technicianId', e.target.value || undefined)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-test">Test Type</Label>
        <Input
          id="filter-test"
          placeholder="Test type"
          value={filters.testType ?? ''}
          onChange={(e) => handleChange('testType', e.target.value || undefined)}
          className="w-40"
        />
      </div>
      {onApply && (
        <Button onClick={onApply} size="sm">
          Apply
        </Button>
      )}
    </div>
  )
}
