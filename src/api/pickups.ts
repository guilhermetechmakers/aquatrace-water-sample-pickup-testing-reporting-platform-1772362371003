/**
 * Pickups API - Create draft pickups, fetch pickups for approvals, CRUD operations
 */

import { supabase } from '@/lib/supabase'
import type { Pickup } from '@/types/rbac'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Input for creating a pickup */
export interface CreatePickupInput {
  technician_id: string
  location?: string
  gps_lat?: number | null
  gps_lng?: number | null
  readings?: Record<string, unknown>
  photos?: string[]
  status?: string
}

/** Input for updating a pickup */
export interface UpdatePickupInput {
  location?: string
  gps_lat?: number | null
  gps_lng?: number | null
  readings?: Record<string, unknown>
  photos?: string[]
  status?: string
}

const PICKUP_STATUSES: Pickup['status'][] = ['scheduled', 'in_progress', 'completed']

function rowToPickup(r: Record<string, unknown>): Pickup {
  const rawStatus = (r.status as string) ?? 'scheduled'
  const status = PICKUP_STATUSES.includes(rawStatus as Pickup['status'])
    ? (rawStatus as Pickup['status'])
    : 'scheduled'
  return {
    id: String(r.id ?? ''),
    technician_id: String(r.technician_id ?? ''),
    customer_id: (r.customer_id as string) ?? null,
    location: String(r.location ?? ''),
    gps_lat: (r.gps_lat as number) ?? null,
    gps_lng: (r.gps_lng as number) ?? null,
    readings: (r.readings as Record<string, unknown>) ?? {},
    photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
    status,
    scheduled_at: (r.scheduled_at as string) ?? null,
    completed_at: (r.completed_at as string) ?? null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}

/** Fetch all pickups (optionally filtered by technician) */
export async function fetchPickups(technicianId?: string): Promise<Pickup[]> {
  if (!isSupabaseConfigured()) return []

  let query = supabase.from('pickups').select('*').order('updated_at', { ascending: false })
  if (technicianId) {
    query = query.eq('technician_id', technicianId)
  }
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as Record<string, unknown>[]
  return rows.map(rowToPickup)
}

/** Fetch a single pickup by ID */
export async function fetchPickup(id: string): Promise<Pickup | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase.from('pickups').select('*').eq('id', id).single()
  if (error || !data) return null
  return rowToPickup(data as Record<string, unknown>)
}

/** Create a pickup */
export async function createPickup(input: CreatePickupInput, _technicianId?: string): Promise<Pickup> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('pickups')
    .insert({
      technician_id: input.technician_id,
      location: input.location ?? 'Draft',
      gps_lat: input.gps_lat ?? null,
      gps_lng: input.gps_lng ?? null,
      readings: input.readings ?? {},
      photos: input.photos ?? [],
      status: input.status ?? 'scheduled',
    })
    .select('*')
    .single()

  if (error) throw error
  return rowToPickup(data as Record<string, unknown>)
}

/** Update a pickup */
export async function updatePickup(id: string, input: UpdatePickupInput): Promise<Pickup> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.location != null) payload.location = input.location
  if (input.gps_lat != null) payload.gps_lat = input.gps_lat
  if (input.gps_lng != null) payload.gps_lng = input.gps_lng
  if (input.readings != null) payload.readings = input.readings
  if (input.photos != null) payload.photos = input.photos
  if (input.status != null) payload.status = input.status

  const { data, error } = await supabase.from('pickups').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return rowToPickup(data as Record<string, unknown>)
}

/** Add readings to a pickup (merge with existing) */
export async function addPickupReadings(
  pickupId: string,
  readings: Record<string, unknown>
): Promise<Pickup> {
  const pickup = await fetchPickup(pickupId)
  if (!pickup) throw new Error('Pickup not found')
  const merged = { ...pickup.readings, ...readings }
  return updatePickup(pickupId, { readings: merged })
}

/** Add photo URLs to a pickup */
export async function addPickupPhotos(pickupId: string, photoUrls: string[]): Promise<Pickup> {
  const pickup = await fetchPickup(pickupId)
  if (!pickup) throw new Error('Pickup not found')
  const photos = [...(pickup.photos ?? []), ...photoUrls]
  return updatePickup(pickupId, { photos })
}

/** Upload a photo file to pickup-photos storage and return the public URL */
export async function uploadPickupPhoto(pickupId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const ext = file.name.split('.').pop() || 'jpg'
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const path = `pickups/${pickupId}/${uniqueId}.${ext}`

  const { error } = await supabase.storage
    .from('pickup-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('pickup-photos').getPublicUrl(path)
  return data.publicUrl
}

/** Create a draft pickup in Supabase to get an ID for attachments */
export async function createDraftPickup(technicianId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('pickups')
    .insert({
      technician_id: technicianId,
      location: 'Draft',
      status: 'draft',
      readings: {},
      photos: [],
    })
    .select('id')
    .single()

  if (error || !data) return null
  return (data as { id: string }).id
}

/** Update a draft pickup with form data */
export async function updateDraftPickup(
  pickupId: string,
  data: {
    vialId?: string
    siteId?: string | null
    vialCount?: number
    sampleId?: string | null
    pH?: number | null
    chlorine?: number | null
    chlorineReading?: number | null
    pickupLocationName?: string | null
    customerSiteNotes?: string | null
    location?: string
    gpsLat?: number | null
    gpsLon?: number | null
    gpsAccuracy?: number | null
    status?: string
  }
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const readings: Record<string, unknown> = {}
  if (data.pH != null) readings.pH = data.pH
  if (data.chlorine != null) readings.chlorine = data.chlorine
  else if (data.chlorineReading != null) readings.chlorine = data.chlorineReading

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (data.vialId != null) payload.vial_id = data.vialId
  if (data.siteId != null) payload.site_id = data.siteId
  if (data.vialCount != null) payload.vial_count = data.vialCount
  if (data.sampleId != null) payload.sample_id = data.sampleId
  if (Object.keys(readings).length > 0) payload.readings = readings
  if (data.chlorineReading != null) payload.chlorine_reading = data.chlorineReading
  if (data.pickupLocationName != null) payload.pickup_location_name = data.pickupLocationName
  if (data.customerSiteNotes != null) payload.customer_site_notes = data.customerSiteNotes
  if (data.location != null) payload.location = data.location
  if (data.gpsLat != null) payload.gps_lat = data.gpsLat
  if (data.gpsLon != null) payload.gps_lng = data.gpsLon
  if (data.gpsAccuracy != null) payload.gps_accuracy = data.gpsAccuracy
  if (data.status != null) payload.status = data.status

  const { error } = await supabase.from('pickups').update(payload).eq('id', pickupId)
  return !error
}
