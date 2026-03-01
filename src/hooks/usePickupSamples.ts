/**
 * React Query hooks for Technician GPS Pickup samples.
 * Integrates offline storage with sync service.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import {
  getPickup,
  savePickup,
  getPhotosByPickupId,
  savePhoto,
  addAuditEntry,
  addStatusHistoryEntry,
  getAuditTrail,
  getStatusHistory,
  generateId,
} from '@/lib/offline-storage'
import { fetchServerPickupsAndMerge, syncPickupsToServer } from '@/lib/sync-service'
import type { SamplePickup, SamplePhoto, CreateSamplePickupInput } from '@/types/pickup-sample'

const QUERY_KEY = ['pickup-samples'] as const

export function usePickupSamples() {
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useQuery({
    queryKey: [...QUERY_KEY, technicianId],
    queryFn: () => fetchServerPickupsAndMerge(technicianId),
    enabled: Boolean(technicianId),
  })
}

export function usePickupSample(id: string | null) {
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ''],
    queryFn: async () => {
      if (!id) return null
      const local = await getPickup(id)
      if (local) return local
      const { merged } = await fetchServerPickupsAndMerge(technicianId)
      return merged.find((p) => p.id === id || p.serverId === id) ?? null
    },
    enabled: Boolean(id && technicianId),
  })
}

export function useCreatePickupSample() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useMutation({
    mutationFn: async (input: Omit<CreateSamplePickupInput, 'technicianId'>) => {
      const now = new Date().toISOString()
      const status = input.status ?? 'Pending'
      const pickup: SamplePickup = {
        ...input,
        id: generateId(),
        serverId: null,
        technicianId,
        synced: false,
        status,
        photos: input.photos ?? [],
        createdAt: now,
        updatedAt: now,
      }
      await savePickup(pickup)
      await addAuditEntry({
        id: generateId(),
        pickupId: pickup.id,
        action: 'Created',
        byUserId: technicianId,
        timestamp: now,
      })
      await addStatusHistoryEntry({
        id: generateId(),
        pickupId: pickup.id,
        status,
        timestamp: now,
        note: status === 'Submitted' ? 'Submitted for sync' : null,
      })
      return pickup
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdatePickupSample() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<SamplePickup>
    }) => {
      const existing = await getPickup(id)
      if (!existing) throw new Error('Pickup not found')
      const now = new Date().toISOString()
      const updated: SamplePickup = {
        ...existing,
        ...updates,
        updatedAt: now,
      }
      await savePickup(updated)
      await addAuditEntry({
        id: generateId(),
        pickupId: id,
        action: 'Updated',
        byUserId: technicianId,
        timestamp: now,
      })
      if (updates.status && updates.status !== existing.status) {
        await addStatusHistoryEntry({
          id: generateId(),
          pickupId: id,
          status: updates.status,
          timestamp: now,
          note: null,
        })
      }
      return updated
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useSyncPickups() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useMutation({
    mutationFn: (onProgress?: (msg: string) => void) =>
      syncPickupsToServer(technicianId, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function usePickupPhotos(pickupId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'photos', pickupId ?? ''],
    queryFn: () => (pickupId ? getPhotosByPickupId(pickupId) : Promise.resolve([])),
    enabled: Boolean(pickupId),
  })
}

export function usePickupAuditTrail(pickupId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'audit', pickupId ?? ''],
    queryFn: () => (pickupId ? getAuditTrail(pickupId) : Promise.resolve([])),
    enabled: Boolean(pickupId),
  })
}

export function usePickupStatusHistory(pickupId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'status-history', pickupId ?? ''],
    queryFn: () => (pickupId ? getStatusHistory(pickupId) : Promise.resolve([])),
    enabled: Boolean(pickupId),
  })
}

export function useAddPickupPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pickupId,
      photo,
    }: {
      pickupId: string
      photo: Omit<SamplePhoto, 'id' | 'createdAt' | 'synced'>
    }) => {
      const now = new Date().toISOString()
      const full: SamplePhoto = {
        ...photo,
        id: generateId(),
        createdAt: now,
        synced: false,
      }
      await savePhoto(full)
      const pickup = await getPickup(pickupId)
      if (pickup) {
        const photos = [...(pickup.photos ?? []), full]
        await savePickup({ ...pickup, photos, updatedAt: now })
      }
      return full
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, 'photos', variables.pickupId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
