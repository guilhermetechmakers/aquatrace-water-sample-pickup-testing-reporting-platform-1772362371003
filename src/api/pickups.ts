import { supabase } from '@/lib/supabase'
import type { Pickup } from '@/types/rbac'

export type CreatePickupInput = Omit<Pickup, 'id' | 'created_at' | 'updated_at'>
export type UpdatePickupInput = Partial<Pickup>

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const mockPhotosStore: Record<string, string[]> = {}

const MOCK_PICKUPS: Pickup[] = [
  {
    id: 'p1',
    technician_id: 'demo-user',
    customer_id: null,
    location: 'Building A',
    gps_lat: 37.7749,
    gps_lng: -122.4194,
    readings: { pH: 7.2, chlorine: 1.5 },
    photos: [],
    status: 'scheduled',
    scheduled_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    technician_id: 'demo-user',
    customer_id: null,
    location: 'Building B',
    gps_lat: null,
    gps_lng: null,
    readings: {},
    photos: [],
    status: 'in_progress',
    scheduled_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function fetchPickups(technicianId?: string): Promise<Pickup[]> {
  if (!isSupabaseConfigured()) {
    const list = technicianId
      ? MOCK_PICKUPS.filter((p) => p.technician_id === technicianId)
      : MOCK_PICKUPS
    return list.map((p) => {
      const extra = mockPhotosStore[p.id]
      return extra?.length ? { ...p, photos: [...(p.photos ?? []), ...extra] } : p
    })
  }
  let q = supabase.from('pickups').select('*').order('created_at', { ascending: false })
  if (technicianId) q = q.eq('technician_id', technicianId)
  const { data } = await q
  return (data ?? []) as Pickup[]
}

export async function fetchPickup(id: string): Promise<Pickup | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_PICKUPS.find((p) => p.id === id) ?? null
  }
  const { data, error } = await supabase.from('pickups').select('*').eq('id', id).single()
  if (error) return null
  return data as Pickup
}

export async function createPickup(pickup: CreatePickupInput, technicianId?: string): Promise<Pickup> {
  const now = new Date().toISOString()
  const full: Omit<Pickup, 'id'> = {
    ...pickup,
    technician_id: pickup.technician_id ?? technicianId ?? '',
    created_at: now,
    updated_at: now,
  }
  if (!isSupabaseConfigured()) {
    return { ...full, id: `mock-${Date.now()}` } as Pickup
  }
  const { data, error } = await supabase.from('pickups').insert(full).select().single()
  if (error) throw new Error(error.message)
  return data as Pickup
}

export async function updatePickup(
  id: string,
  updates: Partial<Pickup>
): Promise<Pickup> {
  if (!isSupabaseConfigured()) {
    return { ...MOCK_PICKUPS[0], ...updates, id }
  }
  const { data, error } = await supabase
    .from('pickups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Pickup
}

export async function addPickupReadings(
  pickupId: string,
  readings: { pH?: number; chlorine?: number }
): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { data } = await supabase.from('pickups').select('readings').eq('id', pickupId).single()
  const existing = (data?.readings as Record<string, number>) ?? {}
  await supabase
    .from('pickups')
    .update({ readings: { ...existing, ...readings } })
    .eq('id', pickupId)
}

export async function addPickupPhoto(pickupId: string, photoUrl: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { data } = await supabase.from('pickups').select('photos').eq('id', pickupId).single()
  const photos = Array.isArray(data?.photos) ? data.photos : []
  await supabase
    .from('pickups')
    .update({ photos: [...photos, photoUrl] })
    .eq('id', pickupId)
}

export async function addPickupPhotos(pickupId: string, photoUrls: string[]): Promise<void> {
  if ((photoUrls ?? []).length === 0) return
  if (!isSupabaseConfigured()) {
    mockPhotosStore[pickupId] = [...(mockPhotosStore[pickupId] ?? []), ...(photoUrls ?? [])]
    return
  }
  const { data } = await supabase.from('pickups').select('photos').eq('id', pickupId).single()
  const existing = Array.isArray(data?.photos) ? data.photos : []
  await supabase
    .from('pickups')
    .update({ photos: [...existing, ...(photoUrls ?? [])] })
    .eq('id', pickupId)
}

/** Upload photo file to Supabase Storage and return public URL. Uses data URL when Supabase not configured. */
export async function uploadPickupPhoto(
  pickupId: string,
  file: File
): Promise<string> {
  if (!isSupabaseConfigured()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `pickups/${pickupId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('pickup-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('pickup-photos').getPublicUrl(path)
  return data.publicUrl
}
