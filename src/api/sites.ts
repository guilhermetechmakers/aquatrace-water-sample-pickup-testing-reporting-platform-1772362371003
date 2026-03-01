/**
 * Sites API - Sample pickup locations
 * Uses Supabase for data; falls back to mock when not configured
 */

import { supabase } from '@/lib/supabase'
import type { Site } from '@/types/pickup-sample'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function rowToSite(row: Record<string, unknown>): Site {
  return {
    id: (row.id as string) ?? '',
    name: (row.name as string) ?? '',
    address: (row.address as string) ?? null,
    customerId: (row.customer_id as string) ?? null,
    lat: (row.lat as number) ?? null,
    lon: (row.lon as number) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export async function fetchSites(): Promise<Site[]> {
  if (!isSupabaseConfigured()) {
    return getMockSites()
  }
  try {
    const { data, error } = await supabase.from('sites').select('*').order('name')
    if (error) return getMockSites()
    const rows = data ?? []
    return Array.isArray(rows) ? rows.map((r) => rowToSite(r as Record<string, unknown>)) : getMockSites()
  } catch {
    return getMockSites()
  }
}

export async function fetchSiteById(id: string): Promise<Site | null> {
  if (!isSupabaseConfigured()) {
    const sites = await getMockSites()
    return sites.find((s) => s.id === id) ?? null
  }
  const { data, error } = await supabase.from('sites').select('*').eq('id', id).single()
  if (error || !data) return null
  return rowToSite(data as Record<string, unknown>)
}

function getMockSites(): Site[] {
  return [
    { id: 'site-1', name: 'Site 1 - Main Building', address: '123 Water St', customerId: null, lat: 37.7749, lon: -122.4194, metadata: {} },
    { id: 'site-2', name: 'Site 2 - North Wing', address: '456 Sample Ave', customerId: null, lat: 37.775, lon: -122.4195, metadata: {} },
    { id: 'site-3', name: 'Site 3 - East Facility', address: '789 Test Blvd', customerId: null, lat: 37.7751, lon: -122.4196, metadata: {} },
  ]
}
