/**
 * Offline-first storage for Technician GPS Pickup data.
 * Uses IndexedDB for persistent local storage with migrations.
 */

import type { SamplePickup, SamplePhoto, AuditTrailEntry, StatusHistoryEntry } from '@/types/pickup-sample'

const DB_NAME = 'aquatrace-offline'
const DB_VERSION = 1
const STORE_PICKUPS = 'pickups'
const STORE_PHOTOS = 'photos'
const STORE_AUDIT = 'audit'
const STORE_STATUS_HISTORY = 'status_history'
const STORE_SYNC_QUEUE = 'sync_queue'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_PICKUPS)) {
        const pickupsStore = db.createObjectStore(STORE_PICKUPS, { keyPath: 'id' })
        pickupsStore.createIndex('technicianId', 'technicianId', { unique: false })
        pickupsStore.createIndex('status', 'status', { unique: false })
        pickupsStore.createIndex('vialId', 'vialId', { unique: false })
        pickupsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        db.createObjectStore(STORE_AUDIT, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_STATUS_HISTORY)) {
        db.createObjectStore(STORE_STATUS_HISTORY, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' })
      }
    }
  })
}

export async function getAllPickups(technicianId: string): Promise<SamplePickup[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PICKUPS, 'readonly')
    const store = tx.objectStore(STORE_PICKUPS)
    const index = store.index('technicianId')
    const request = index.getAll(technicianId)
    request.onsuccess = () => {
      const data = request.result ?? []
      resolve(Array.isArray(data) ? data : [])
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function getPickup(id: string): Promise<SamplePickup | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PICKUPS, 'readonly')
    const request = tx.objectStore(STORE_PICKUPS).get(id)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function savePickup(pickup: SamplePickup): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PICKUPS, 'readwrite')
    tx.objectStore(STORE_PICKUPS).put(pickup)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function deletePickup(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PICKUPS, 'readwrite')
    tx.objectStore(STORE_PICKUPS).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPhotosByPickupId(pickupId: string): Promise<SamplePhoto[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly')
    const store = tx.objectStore(STORE_PHOTOS)
    const request = store.getAll()
    request.onsuccess = () => {
      const all = request.result ?? []
      const filtered = Array.isArray(all)
        ? (all as SamplePhoto[]).filter((p) => p.pickupId === pickupId)
        : []
      resolve(filtered)
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function savePhoto(photo: SamplePhoto): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite')
    tx.objectStore(STORE_PHOTOS).put(photo)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAuditTrail(pickupId: string): Promise<AuditTrailEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT, 'readonly')
    const request = tx.objectStore(STORE_AUDIT).getAll()
    request.onsuccess = () => {
      const all = request.result ?? []
      const filtered = Array.isArray(all)
        ? (all as AuditTrailEntry[]).filter((e) => e.pickupId === pickupId)
        : []
      resolve(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function addAuditEntry(entry: AuditTrailEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT, 'readwrite')
    tx.objectStore(STORE_AUDIT).put(entry)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getStatusHistory(pickupId: string): Promise<StatusHistoryEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUS_HISTORY, 'readonly')
    const request = tx.objectStore(STORE_STATUS_HISTORY).getAll()
    request.onsuccess = () => {
      const all = request.result ?? []
      const filtered = Array.isArray(all)
        ? (all as StatusHistoryEntry[]).filter((e) => e.pickupId === pickupId)
        : []
      resolve(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    }
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function addStatusHistoryEntry(entry: StatusHistoryEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STATUS_HISTORY, 'readwrite')
    tx.objectStore(STORE_STATUS_HISTORY).put(entry)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getPendingSyncPickups(technicianId: string): Promise<SamplePickup[]> {
  const all = await getAllPickups(technicianId)
  return (all ?? []).filter((p) => !p.synced && (p.status === 'Submitted' || p.status === 'Pending'))
}

export function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Alias for addStatusHistoryEntry (backward compatibility) */
export async function addStatusHistory(entry: StatusHistoryEntry): Promise<void> {
  return addStatusHistoryEntry(entry)
}

/** Unified offline storage API */
export const offlineStorage = {
  getAllPickups,
  getPickup,
  savePickup,
  deletePickup,
  getPhotosByPickupId,
  savePhoto,
  getAuditTrail,
  addAuditEntry,
  getStatusHistory,
  addStatusHistoryEntry,
  addStatusHistory,
  getPendingSyncPickups,
  generateId,
}
