import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import * as pickupsApi from '@/api/pickups'
import type { CreatePickupInput, UpdatePickupInput } from '@/api/pickups'

const QUERY_KEY = ['pickups'] as const

export function usePickups() {
  const { user } = useAuth()
  const { getVisibleData } = useRBAC()
  const { scope } = getVisibleData('pickups')

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? '', scope],
    queryFn: () =>
      scope === 'owner' && user?.id
        ? pickupsApi.fetchPickups(user.id)
        : pickupsApi.fetchPickups(),
    enabled: Boolean(user),
  })
}

export function usePickup(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id ?? ''],
    queryFn: () => (id ? pickupsApi.fetchPickup(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  })
}

export function useCreatePickup() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: Omit<CreatePickupInput, 'technician_id'>) =>
      pickupsApi.createPickup(
        {
          ...input,
          technician_id: user?.id ?? '',
        },
        user?.id
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdatePickup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePickupInput }) =>
      pickupsApi.updatePickup(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useAddPickupReadings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pickupId, readings }: { pickupId: string; readings: Record<string, unknown> }) =>
      pickupsApi.addPickupReadings(pickupId, readings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useAddPickupPhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pickupId, photoUrls }: { pickupId: string; photoUrls: string[] }) =>
      pickupsApi.addPickupPhotos(pickupId, photoUrls),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
