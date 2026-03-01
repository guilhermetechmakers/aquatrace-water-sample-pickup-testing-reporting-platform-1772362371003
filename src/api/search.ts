/**
 * Search & Filter API for AquaTrace
 * Unified search across samples, reports, customers, invoices
 * Uses Supabase client with RLS - no Edge Functions required
 */

import { supabase } from '@/lib/supabase'
import type {
  SearchParams,
  SearchResult,
  SavedSearch,
  AutocompleteSuggestion,
  SearchEntityType,
  SearchFilters,
} from '@/types/search'
import type { SamplePickup } from '@/types/pickup-sample'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function mapServerStatus(s: string): SamplePickup['status'] {
  const lower = (s ?? '').toLowerCase()
  const map: Record<string, SamplePickup['status']> = {
    draft: 'Draft',
    pending_pickup: 'PendingPickup',
    pending: 'Pending',
    submitted: 'Submitted',
    synced: 'Synced',
    in_lab: 'InLab',
    lab_approved: 'LabApproved',
    archived: 'Archived',
    rejected: 'Rejected',
    scheduled: 'Pending',
    in_progress: 'Pending',
    completed: 'Synced',
  }
  return map[lower] ?? 'Pending'
}

function rowToSamplePickup(r: Record<string, unknown>, technicianId: string): SamplePickup {
  const readings = (r.readings as Record<string, unknown>) ?? {}
  const photos = Array.isArray(r.photos) ? (r.photos as string[]) : []
  const chlorineVal = (readings.chlorine as number) ?? (r.chlorine_reading as number) ?? null
  return {
    id: (r.id as string) ?? '',
    serverId: r.id as string,
    vialId: (r.vial_id as string) ?? '',
    sampleId: (r.sample_id as string) ?? null,
    siteId: (r.site_id as string) ?? null,
    vialCount: (r.vial_count as number) ?? 1,
    pH: (readings.pH as number) ?? null,
    chlorine: chlorineVal,
    chlorineReading: chlorineVal,
    volume: (r.volume as number) ?? 100,
    timestamp: (r.sample_timestamp as string) ?? (r.updated_at as string) ?? new Date().toISOString(),
    gpsLat: (r.gps_lat as number) ?? null,
    gpsLon: (r.gps_lng as number) ?? null,
    gpsAccuracy: (r.gps_accuracy as number) ?? null,
    technicianId: (r.technician_id as string) ?? technicianId,
    customerSiteNotes: (r.customer_site_notes as string) ?? null,
    pickupLocationName: (r.pickup_location_name as string) ?? null,
    location: (r.location as string) ?? '',
    photos: photos.map((url, i) => ({
      id: `photo-${r.id}-${i}`,
      pickupId: r.id as string,
      localUri: url,
      serverUrl: url,
      exif: null,
      createdAt: new Date().toISOString(),
      synced: true,
    })),
    status: mapServerStatus(r.status as string),
    synced: true,
    archived: (r.archived as boolean) ?? false,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
  }
}

/** Search samples (pickups) with filters */
export async function searchSamples(
  params: SearchParams,
  technicianId?: string
): Promise<SearchResult<SamplePickup>> {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page: params.page ?? 1, limit: params.limit ?? 20 }
  }

  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 20, 100)
  const offset = (page - 1) * limit
  const filters = params.filters ?? {}
  const sortBy = params.sort ?? 'updated_at'
  const sortDir = params.sortDir ?? 'desc'

  let q = supabase
    .from('pickups')
    .select('*', { count: 'exact' })

  if (technicianId) {
    q = q.eq('technician_id', technicianId)
  }

  if (params.query?.trim()) {
    const query = params.query.trim()
    q = q.or(`vial_id.ilike.%${query}%,sample_id.ilike.%${query}%,location.ilike.%${query}%,customer_site_notes.ilike.%${query}%,pickup_location_name.ilike.%${query}%`)
  }

  if (filters.status && filters.status !== 'all') {
    const statusMap: Record<string, string> = {
      Draft: 'draft',
      PendingPickup: 'pending_pickup',
      Pending: 'pending',
      Submitted: 'submitted',
      Synced: 'synced',
      InLab: 'in_lab',
      LabApproved: 'lab_approved',
      Archived: 'archived',
      Rejected: 'rejected',
    }
    const serverStatus = statusMap[filters.status as string] ?? (filters.status as string).toLowerCase()
    q = q.eq('status', serverStatus)
  }

  if (filters.siteId) {
    q = q.eq('site_id', filters.siteId)
  }
  if (Array.isArray(filters.siteIds) && filters.siteIds.length > 0) {
    q = q.in('site_id', filters.siteIds)
  }

  if (filters.startDate) {
    q = q.gte('sample_timestamp', filters.startDate)
  }
  if (filters.endDate) {
    q = q.lte('sample_timestamp', `${filters.endDate}T23:59:59`)
  }

  q = q.order(sortBy, { ascending: sortDir === 'asc' })
  q = q.range(offset, offset + limit - 1)

  const { data: rows, error, count } = await q

  if (error) {
    return { data: [], total: 0, page, limit }
  }

  const list = rows ?? []
  const items = Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => rowToSamplePickup(r, technicianId ?? ''))
    : []
  const total = typeof count === 'number' ? count : items.length

  return { data: items, total, page, limit }
}

/** Search reports with filters */
export async function searchReports(params: SearchParams): Promise<SearchResult<Record<string, unknown>>> {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page: params.page ?? 1, limit: params.limit ?? 20 }
  }

  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 20, 100)
  const offset = (page - 1) * limit
  const filters = params.filters ?? {}
  const sortBy = params.sort ?? 'created_at'
  const sortDir = params.sortDir ?? 'desc'

  let q = supabase
    .from('reports')
    .select('*', { count: 'exact' })

  if (params.query?.trim()) {
    q = q.ilike('report_id', `%${params.query.trim()}%`)
  }
  if (filters.customerId) {
    q = q.eq('customer_id', filters.customerId)
  }
  if (filters.status) {
    q = q.eq('status', filters.status)
  }

  q = q.order(sortBy, { ascending: sortDir === 'asc' })
  q = q.range(offset, offset + limit - 1)

  const { data: rows, error, count } = await q

  if (error) {
    return { data: [], total: 0, page, limit }
  }

  const list = rows ?? []
  const items = Array.isArray(list) ? list : []
  const total = typeof count === 'number' ? count : items.length

  return { data: items, total, page, limit }
}

/** Search customers with filters */
export async function searchCustomers(params: SearchParams): Promise<SearchResult<Record<string, unknown>>> {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page: params.page ?? 1, limit: params.limit ?? 20 }
  }

  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 20, 100)
  const offset = (page - 1) * limit
  const sortBy = params.sort ?? 'name'
  const sortDir = params.sortDir ?? 'asc'

  let q = supabase
    .from('customers')
    .select('*', { count: 'exact' })

  if (params.query?.trim()) {
    const query = params.query.trim()
    q = q.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
  }

  q = q.order(sortBy, { ascending: sortDir === 'asc' })
  q = q.range(offset, offset + limit - 1)

  const { data: rows, error, count } = await q

  if (error) {
    return { data: [], total: 0, page, limit }
  }

  const list = rows ?? []
  const items = Array.isArray(list) ? list : []
  const total = typeof count === 'number' ? count : items.length

  return { data: items, total, page, limit }
}

/** Search invoices with filters */
export async function searchInvoices(params: SearchParams): Promise<SearchResult<Record<string, unknown>>> {
  if (!isSupabaseConfigured()) {
    return { data: [], total: 0, page: params.page ?? 1, limit: params.limit ?? 20 }
  }

  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 20, 100)
  const offset = (page - 1) * limit
  const filters = params.filters ?? {}
  const sortBy = params.sort ?? 'date'
  const sortDir = params.sortDir ?? 'desc'

  let q = supabase
    .from('invoices')
    .select('*', { count: 'exact' })

  if (params.query?.trim()) {
    q = q.ilike('invoice_id', `%${params.query.trim()}%`)
  }
  if (filters.customerId) {
    q = q.eq('customer_id', filters.customerId)
  }
  if (filters.status) {
    q = q.eq('status', filters.status)
  }
  if (filters.startDate) {
    q = q.gte('date', filters.startDate)
  }
  if (filters.endDate) {
    q = q.lte('date', filters.endDate)
  }

  q = q.order(sortBy, { ascending: sortDir === 'asc' })
  q = q.range(offset, offset + limit - 1)

  const { data: rows, error, count } = await q

  if (error) {
    return { data: [], total: 0, page, limit }
  }

  const list = rows ?? []
  const items = Array.isArray(list) ? list : []
  const total = typeof count === 'number' ? count : items.length

  return { data: items, total, page, limit }
}

/** Unified search */
export async function search(
  params: SearchParams,
  technicianId?: string
): Promise<SearchResult<unknown>> {
  const type = params.type ?? 'samples'

  switch (type) {
    case 'samples':
      return searchSamples(params, technicianId)
    case 'reports':
      return searchReports(params)
    case 'customers':
      return searchCustomers(params)
    case 'invoices':
      return searchInvoices(params)
    default:
      return searchSamples(params, technicianId)
  }
}

/** Autocomplete suggestions */
export async function fetchAutocompleteSuggestions(
  query: string,
  types: SearchEntityType[] = ['samples', 'reports', 'customers', 'invoices']
): Promise<AutocompleteSuggestion[]> {
  if (!isSupabaseConfigured() || !query?.trim()) {
    return []
  }

  const q = query.trim().toLowerCase()
  const suggestions: AutocompleteSuggestion[] = []

  if (types.includes('samples')) {
    const { data: rows } = await supabase
      .from('pickups')
      .select('id, vial_id, sample_id, location')
      .or(`vial_id.ilike.%${q}%,sample_id.ilike.%${q}%,location.ilike.%${q}%`)
      .limit(2)

    const list = Array.isArray(rows) ? rows : []
    for (const r of list) {
      const row = r as Record<string, unknown>
      suggestions.push({
        id: (row.id as string) ?? '',
        type: 'samples',
        label: (row.vial_id as string) ?? (row.sample_id as string) ?? '',
        subtitle: (row.location as string) ?? undefined,
      })
    }
  }

  if (types.includes('customers') && suggestions.length < 5) {
    const { data: rows } = await supabase
      .from('customers')
      .select('id, name, email')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(2)

    const list = Array.isArray(rows) ? rows : []
    for (const r of list) {
      const row = r as Record<string, unknown>
      suggestions.push({
        id: (row.id as string) ?? '',
        type: 'customers',
        label: (row.name as string) ?? '',
        subtitle: (row.email as string) ?? undefined,
      })
    }
  }

  if (types.includes('reports') && suggestions.length < 5) {
    const { data: rows } = await supabase
      .from('reports')
      .select('id, report_id')
      .ilike('report_id', `%${q}%`)
      .limit(2)

    const list = Array.isArray(rows) ? rows : []
    for (const r of list) {
      const row = r as Record<string, unknown>
      suggestions.push({
        id: (row.id as string) ?? '',
        type: 'reports',
        label: (row.report_id as string) ?? '',
      })
    }
  }

  return suggestions.slice(0, 5)
}

/** Saved searches CRUD */
export async function fetchSavedSearches(type?: SearchEntityType): Promise<SavedSearch[]> {
  if (!isSupabaseConfigured()) return []

  let q = supabase
    .from('saved_searches')
    .select('*')
    .order('updated_at', { ascending: false })

  if (type) {
    q = q.eq('type', type)
  }

  const { data: rows, error } = await q

  if (error) return []

  const list = rows ?? []
  return Array.isArray(list)
    ? list.map((r: Record<string, unknown>) => ({
        id: (r.id as string) ?? '',
        userId: (r.user_id as string) ?? '',
        name: (r.name as string) ?? '',
        type: (r.type as SavedSearch['type']) ?? 'samples',
        query: (r.query as string) ?? '',
        filters: (r.filters as SearchFilters) ?? {},
        sortBy: (r.sort_by as string) ?? 'updated_at',
        sortDir: ((r.sort_dir as string) ?? 'desc') as 'asc' | 'desc',
        createdAt: (r.created_at as string) ?? '',
        updatedAt: (r.updated_at as string) ?? '',
      }))
    : []
}

export async function createSavedSearch(input: {
  name: string
  type: SearchEntityType
  query?: string
  filters?: SearchFilters
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}): Promise<SavedSearch | null> {
  if (!isSupabaseConfigured()) return null

  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) return null

  const { data: row, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: userId,
      name: input.name,
      type: input.type,
      query: input.query ?? '',
      filters: input.filters ?? {},
      sort_by: input.sortBy ?? 'updated_at',
      sort_dir: input.sortDir ?? 'desc',
    })
    .select()
    .single()

  if (error || !row) return null

  const r = row as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    userId: (r.user_id as string) ?? '',
    name: (r.name as string) ?? '',
    type: (r.type as SavedSearch['type']) ?? 'samples',
    query: (r.query as string) ?? '',
    filters: (r.filters as SearchFilters) ?? {},
    sortBy: (r.sort_by as string) ?? 'updated_at',
    sortDir: ((r.sort_dir as string) ?? 'desc') as 'asc' | 'desc',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  }
}

export async function updateSavedSearch(
  id: string,
  input: Partial<{ name: string; query: string; filters: SearchFilters; sortBy: string; sortDir: 'asc' | 'desc' }>
): Promise<SavedSearch | null> {
  if (!isSupabaseConfigured()) return null

  const updates: Record<string, unknown> = {}
  if (input.name != null) updates.name = input.name
  if (input.query != null) updates.query = input.query
  if (input.filters != null) updates.filters = input.filters
  if (input.sortBy != null) updates.sort_by = input.sortBy
  if (input.sortDir != null) updates.sort_dir = input.sortDir

  const { data: row, error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !row) return null

  const r = row as Record<string, unknown>
  return {
    id: (r.id as string) ?? '',
    userId: (r.user_id as string) ?? '',
    name: (r.name as string) ?? '',
    type: (r.type as SavedSearch['type']) ?? 'samples',
    query: (r.query as string) ?? '',
    filters: (r.filters as SearchFilters) ?? {},
    sortBy: (r.sort_by as string) ?? 'updated_at',
    sortDir: ((r.sort_dir as string) ?? 'desc') as 'asc' | 'desc',
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  }
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase.from('saved_searches').delete().eq('id', id)
  return !error
}
