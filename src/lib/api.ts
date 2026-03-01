const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') ?? null : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers as Record<string, string>),
    },
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error?.message ?? `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data != null ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data != null ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data != null ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
}

export class ApiError extends Error {
  status?: number
  code?: string
  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * apiFetch with runtime guards - validates response shape, returns safe arrays.
 * Use for API responses that return lists.
 */
export async function apiFetchList<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ data: T[]; count?: number }> {
  const raw = await apiRequest<{ data?: T[]; items?: T[]; count?: number }>(endpoint, options)
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.items) ? raw.items : []
  const count = typeof raw?.count === 'number' ? raw.count : list.length
  return { data: list, count }
}

/**
 * Safely extract array from API response with runtime validation.
 */
export function safeArrayFromApi<T>(
  response: { data?: T[]; items?: T[] } | null | undefined
): T[] {
  const list = response?.data ?? response?.items ?? []
  return Array.isArray(list) ? list : []
}
