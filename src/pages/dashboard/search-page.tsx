/**
 * Unified Search Page
 * Search across samples, reports, customers, invoices with faceted filters.
 * Powers pages 009, 013, 017, 019 via global search.
 */

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bookmark, Droplets, FileText, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SearchBar, FacetedFilterPanel, SavedSearchManager, ResultList } from '@/components/search'
import { useSearch, useSavedSearches } from '@/hooks/useSearch'
import { useSites } from '@/hooks/useSites'
import { useBillingCustomers } from '@/hooks/useBilling'
import { useRBAC } from '@/hooks/useRBAC'
import type { SearchEntityType, SearchFilters, SavedSearch } from '@/types/search'

const ENTITY_TYPES: { value: SearchEntityType; label: string; icon: typeof Droplets }[] = [
  { value: 'samples', label: 'Samples', icon: Droplets },
  { value: 'reports', label: 'Reports', icon: FileText },
  { value: 'customers', label: 'Customers', icon: Users },
  { value: 'invoices', label: 'Invoices', icon: DollarSign },
]

const REPORT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'distributed', label: 'Distributed' },
]

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

function getStatusOptionsForType(entityType: SearchEntityType) {
  if (entityType === 'reports') return REPORT_STATUS_OPTIONS
  if (entityType === 'invoices') return INVOICE_STATUS_OPTIONS
  return [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Submitted', label: 'Submitted' },
    { value: 'Synced', label: 'Synced' },
    { value: 'Rejected', label: 'Rejected' },
  ]
}

export function SearchPage() {
  const { hasPermission } = useRBAC()
  const [urlParams] = useSearchParams()
  const qFromUrl = urlParams.get('q') ?? ''
  const typeFromUrl = (urlParams.get('type') ?? 'samples') as SearchEntityType
  const [query, setQuery] = useState(qFromUrl)
  const [type, setType] = useState<SearchEntityType>(typeFromUrl)

  useEffect(() => {
    setQuery(qFromUrl)
    setType(typeFromUrl)
  }, [qFromUrl, typeFromUrl])
  const [filters, setFilters] = useState<SearchFilters>({})
  const [page, setPage] = useState(1)
  const [savedSearchOpen, setSavedSearchOpen] = useState(false)

  const { data: sites = [] } = useSites()
  const { data: customersData } = useBillingCustomers({
    limit: 50,
    page: 1,
  })
  const apiParams = useMemo(
    () => ({
      query: query.trim() || undefined,
      type,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      page,
      limit: 20,
    }),
    [query, type, filters, page]
  )

  const { data: searchResult, isLoading } = useSearch(apiParams, { enabled: true })
  const { data: savedList = [] } = useSavedSearches(type)

  const rawData = searchResult?.data ?? []
  const results = (Array.isArray(rawData) ? rawData : []) as Record<string, unknown>[]
  const total = typeof searchResult?.total === 'number' ? searchResult.total : results.length
  const savedSearches = Array.isArray(savedList) ? savedList : []

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setQuery(saved.query ?? '')
    setType(saved.type)
    setFilters(saved.filters ?? {})
    setPage(1)
  }

  const customersForFilter = useMemo(() => {
    if (type !== 'reports' && type !== 'invoices') return []
    const list = Array.isArray(customersData?.customers) ? customersData!.customers : []
    return list.map((c) => ({ id: c.id, name: c.name }))
  }, [type, customersData])

  const canSearch = hasPermission('search', 'read')

  if (!canSearch) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground">
              You do not have permission to search.
            </p>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Search</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search across samples, reports, customers, and invoices
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSavedSearchOpen(true)}
          aria-label="Manage saved searches"
        >
          <Bookmark className="h-4 w-4 mr-1" />
          Saved ({savedSearches.length})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search..."
                  entityType={type}
                />
              </div>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as SearchEntityType)
                  setPage(1)
                }}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-[140px]"
                aria-label="Entity type"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <FacetedFilterPanel
              filters={filters}
              onChange={setFilters}
              entityType={type}
              sites={(sites ?? []).map((s) => ({ id: s.id, name: s.name }))}
              customers={customersForFilter}
              statusOptions={getStatusOptionsForType(type)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ResultList
            items={results}
            entityType={type}
            total={total}
            page={page}
            limit={20}
            onPageChange={setPage}
            onFilterBy={(item) => {
              const label =
                type === 'samples'
                  ? (item.sampleId as string) ?? (item.vialId as string) ?? (item.id as string)
                  : type === 'customers'
                    ? (item.name as string) ?? (item.email as string)
                    : type === 'reports'
                      ? (item.report_id as string)
                      : (item.invoice_id as string)
              if (label) setQuery(String(label))
            }}
            isLoading={isLoading}
            emptyMessage="Try adjusting your search or filters."
          />
        </CardContent>
      </Card>

      <SavedSearchManager
        open={savedSearchOpen}
        onOpenChange={setSavedSearchOpen}
        onLoadSearch={handleLoadSavedSearch}
        currentFilters={filters}
        currentQuery={query}
        currentType={type}
      />
    </div>
  )
}

