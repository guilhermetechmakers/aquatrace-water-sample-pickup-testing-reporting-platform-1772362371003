/**
 * Search & Filter types for AquaTrace
 */

export type SearchEntityType = 'samples' | 'reports' | 'customers' | 'invoices'

export interface SearchFilters {
  startDate?: string
  endDate?: string
  status?: string | string[]
  customerId?: string
  customerIds?: string[]
  siteId?: string
  siteIds?: string[]
}

export interface SearchParams {
  query?: string
  type?: SearchEntityType
  filters?: SearchFilters
  page?: number
  limit?: number
  sort?: string
  sortDir?: 'asc' | 'desc'
}

export interface SearchResultItem {
  id: string
  type: 'sample' | 'report' | 'customer' | 'invoice'
  sampleId?: string
  vialId?: string
  siteId?: string
  technicianId?: string
  location?: string
  status?: string
  timestamp?: string
  pH?: number | null
  chlorine?: number | null
  reportId?: string
  customerId?: string
  customerName?: string
  name?: string
  email?: string
  invoiceId?: string
  date?: string
  dueDate?: string
  amount?: number
  createdAt?: string
  updatedAt?: string
}

export interface SearchResponse {
  data: SearchResultItem[]
  total: number
  facets: Record<string, string[]>
  page: number
  limit: number
}

export interface AutocompleteSuggestion {
  id: string
  type: SearchEntityType
  label: string
  subtitle?: string
  meta?: string
}

export interface SearchResult<T> {
  data: T[]
  total: number
  facets?: Record<string, { value: string; label: string; count: number }[]>
  page: number
  limit: number
}

export interface SavedSearch {
  id: string
  userId: string
  name: string
  type: SearchEntityType
  query: string
  filters: SearchFilters
  sortBy: string
  sortDir: 'asc' | 'desc'
  createdAt: string
  updatedAt: string
}

export interface CreateSavedSearchPayload {
  name: string
  type: SearchEntityType
  query?: string
  filters?: SearchFilters
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}
