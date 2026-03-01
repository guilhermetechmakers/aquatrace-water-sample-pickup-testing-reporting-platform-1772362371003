/**
 * Offline sync service for Technician GPS Pickup data.
 * Implements exponential backoff, retry queue, and conflict resolution.
 * Conflict resolution: last-write-wins (technician-hosted precedence for field data).
 */

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        onRetry?.(attempt + 1, err)
        await sleep(delay)
      }
    }
  }
  throw lastError
}

import type { SamplePickup } from '@/types/pickup-sample'
import {
  getAllPickups,
  getPendingSyncPickups,
  savePickup,
  getPhotosByPickupId,
  savePhoto,
  addAuditEntry,
  addStatusHistoryEntry,
} from '@/lib/offline-storage'
import { supabase } from '@/lib/supabase'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function toServerPickup(p: SamplePickup): Record<string, unknown> {
  return {
    technician_id: p.technicianId,
    location: p.location || 'Site',
    vial_id: p.vialId,
    gps_lat: p.gpsLat,
    gps_lng: p.gpsLon,
    gps_accuracy: p.gpsAccuracy,
    readings: { pH: p.pH, chlorine: p.chlorine },
    volume: p.volume,
    sample_timestamp: p.timestamp,
    customer_site_notes: p.customerSiteNotes,
    status: p.status.toLowerCase(),
    photos: (p.photos ?? []).map((ph) => ph.serverUrl ?? ph.localUri).filter(Boolean),
  }
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  failedCount: number
  errors: string[]
}

export async function syncPickupsToServer(
  technicianId: string,
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  const errors: string[] = []
  let syncedCount = 0
  let failedCount = 0

  if (!isSupabaseConfigured()) {
    return { success: false, syncedCount: 0, failedCount: 0, errors: ['Supabase not configured'] }
  }

  const pending = await getPendingSyncPickups(technicianId)
  const items = Array.isArray(pending) ? pending : []

  for (let i = 0; i < items.length; i++) {
    const pickup = items[i]
    if (!pickup) continue

    onProgress?.(`Syncing ${pickup.vialId} (${i + 1}/${items.length})...`)

    try {
      const payload = toServerPickup(pickup)
      let serverId = pickup.serverId

      if (serverId) {
        await withExponentialBackoff(
          async () => {
            const { error } = await supabase
              .from('pickups')
              .update({
                ...payload,
                updated_at: new Date().toISOString(),
              })
              .eq('id', serverId)
            if (error) throw new Error(error.message)
          },
          (attempt) => onProgress?.(`Retry ${attempt} for ${pickup.vialId}...`)
        )
      } else {
        const result = await withExponentialBackoff(
          async () => {
            const { data, error } = await supabase
              .from('pickups')
              .insert({
                ...payload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single()
            if (error) throw new Error(error.message)
            return data?.id ?? null
          },
          (attempt) => onProgress?.(`Retry ${attempt} for ${pickup.vialId}...`)
        )
        serverId = result
      }

      const photos = await getPhotosByPickupId(pickup.id)
      const photoList = Array.isArray(photos) ? photos : []
      for (const photo of photoList) {
        if (!photo.synced && photo.localUri.startsWith('data:')) {
          const base64 = photo.localUri.split(',')[1]
          if (base64) {
            const blob = await fetch(photo.localUri).then((r) => r.blob())
            const ext = blob.type?.split('/')[1] ?? 'jpg'
            const path = `pickups/${serverId}/${photo.id}.${ext}`
            const { error } = await supabase.storage
              .from('pickup-photos')
              .upload(path, blob, { upsert: true })
            if (!error) {
              const { data: urlData } = supabase.storage.from('pickup-photos').getPublicUrl(path)
              await savePhoto({
                ...photo,
                serverUrl: urlData?.publicUrl ?? null,
                synced: true,
              })
            }
          }
        }
      }

      const updated: SamplePickup = {
        ...pickup,
        serverId: serverId ?? pickup.serverId,
        synced: true,
        status: 'Synced',
        updatedAt: new Date().toISOString(),
      }
      await savePickup(updated)
      await addAuditEntry({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        pickupId: pickup.id,
        action: 'Synced',
        byUserId: technicianId,
        timestamp: new Date().toISOString(),
      })
      await addStatusHistoryEntry({
        id: `status-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        pickupId: pickup.id,
        status: 'Synced',
        timestamp: new Date().toISOString(),
        note: 'Synced to server',
      })
      syncedCount++
    } catch (err) {
      failedCount++
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${pickup.vialId}: ${msg}`)
    }
  }

  return {
    success: failedCount === 0,
    syncedCount,
    failedCount,
    errors,
  }
}

export async function fetchServerPickupsAndMerge(
  technicianId: string
): Promise<{ merged: SamplePickup[]; count: number }> {
  const local = await getAllPickups(technicianId)
  const localList = Array.isArray(local) ? local : []

  if (!isSupabaseConfigured()) {
    return { merged: localList, count: localList.length }
  }

  const { data: serverData } = await supabase
    .from('pickups')
    .select('*')
    .eq('technician_id', technicianId)
    .order('updated_at', { ascending: false })

  const serverRows = Array.isArray(serverData) ? serverData : []
  const mergedMap = new Map<string, SamplePickup>()

  for (const row of serverRows) {
    const r = row as Record<string, unknown>
    const readings = (r.readings as Record<string, unknown>) ?? {}
    const photos = Array.isArray(r.photos) ? (r.photos as string[]) : []
    const pickup: SamplePickup = {
      id: (r.id as string) ?? '',
      serverId: r.id as string,
      vialId: (r.vial_id as string) ?? '',
      pH: (readings.pH as number) ?? null,
      chlorine: (readings.chlorine as number) ?? null,
      volume: (r.volume as number) ?? 100,
      timestamp: (r.sample_timestamp as string) ?? (r.updated_at as string) ?? new Date().toISOString(),
      gpsLat: (r.gps_lat as number) ?? null,
      gpsLon: (r.gps_lng as number) ?? null,
      gpsAccuracy: (r.gps_accuracy as number) ?? null,
      technicianId: (r.technician_id as string) ?? technicianId,
      customerSiteNotes: (r.customer_site_notes as string) ?? null,
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
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
    }
    mergedMap.set(pickup.serverId ?? pickup.id, pickup)
  }

  for (const localPickup of localList) {
    if (localPickup.synced && localPickup.serverId) {
      const existing = mergedMap.get(localPickup.serverId)
      if (!existing || new Date(localPickup.updatedAt) > new Date(existing.updatedAt)) {
        mergedMap.set(localPickup.serverId, localPickup)
      }
    } else {
      mergedMap.set(localPickup.id, localPickup)
    }
  }

  const merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  return { merged, count: merged.length }
}

function mapServerStatus(s: string): SamplePickup['status'] {
  const lower = (s ?? '').toLowerCase()
  if (['pending', 'submitted', 'synced', 'rejected'].includes(lower)) {
    return (lower.charAt(0).toUpperCase() + lower.slice(1)) as SamplePickup['status']
  }
  if (lower === 'scheduled' || lower === 'in_progress') return 'Pending'
  if (lower === 'completed') return 'Synced'
  return 'Pending'
}
