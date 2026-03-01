/**
 * React Query hooks for Search & Filter
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import {
  search,
  searchSamples,
  fetchAutocompleteSuggestions,
  fetchSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
} from '@/api/search'
import type { SearchParams, SearchEntityType, SearchFilters } from '@/types/search'

const SEARCH_KEYS = {
  all: ['search'] as const,
  list: (params: SearchParams, technicianId?: string) =>
    [...SEARCH_KEYS.all, 'list', params, technicianId] as const,
  autocomplete: (query: string, types: SearchEntityType[]) =>
    [...SEARCH_KEYS.all, 'autocomplete', query, types] as const,
  savedSearches: (type?: SearchEntityType) =>
    [...SEARCH_KEYS.all, 'saved', type] as const,
}

export function useSearch(params: SearchParams, options?: { enabled?: boolean }) {
  const { user } = useAuth()
  const technicianId = params.type === 'samples' ? user?.id : undefined

  return useQuery({
    queryKey: SEARCH_KEYS.list(params, technicianId),
    queryFn: () => search(params, technicianId),
    enabled: options?.enabled ?? true,
  })
}

export function useTechnicianSamplesSearch(params: Omit<SearchParams, 'type'>) {
  const { user } = useAuth()
  const technicianId = user?.id ?? ''

  return useQuery({
    queryKey: SEARCH_KEYS.list({ ...params, type: 'samples' }, technicianId),
    queryFn: () => searchSamples({ ...params, type: 'samples' }, technicianId),
    enabled: Boolean(technicianId),
  })
}

export function useAutocompleteSuggestions(
  query: string,
  types: SearchEntityType[] = ['samples', 'reports', 'customers', 'invoices'],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: SEARCH_KEYS.autocomplete(query, types),
    queryFn: () => fetchAutocompleteSuggestions(query, types),
    enabled: (options?.enabled ?? true) && query.trim().length >= 2,
    staleTime: 30_000,
  })
}

export function useSavedSearches(type?: SearchEntityType) {
  return useQuery({
    queryKey: SEARCH_KEYS.savedSearches(type),
    queryFn: () => fetchSavedSearches(type),
  })
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      name: string
      type: SearchEntityType
      query?: string
      filters?: SearchFilters
      sortBy?: string
      sortDir?: 'asc' | 'desc'
    }) => createSavedSearch(input),
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: SEARCH_KEYS.savedSearches(data.type) })
      }
    },
  })
}

export function useUpdateSavedSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string
      name?: string
      query?: string
      filters?: SearchFilters
      sortBy?: string
      sortDir?: 'asc' | 'desc'
    }) => updateSavedSearch(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_KEYS.all })
    },
  })
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_KEYS.all })
    },
  })
}
