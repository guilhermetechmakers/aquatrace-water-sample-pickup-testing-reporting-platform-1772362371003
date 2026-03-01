/**
 * Portal utilities - Runtime safety guards and validation helpers
 * Mandatory: use data ?? [] for API results, guard all array operations
 */

/**
 * Safely map over an array. Returns empty array if input is null/undefined or not an array.
 */
export function safeArrayMap<T, U>(
  items: T[] | null | undefined,
  mapper: (item: T, index: number) => U
): U[] {
  const list = items ?? []
  return Array.isArray(list) ? list.map(mapper) : []
}

/**
 * Safely filter an array. Returns empty array if input is null/undefined or not an array.
 */
export function safeArrayFilter<T>(
  items: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean
): T[] {
  const list = items ?? []
  return Array.isArray(list) ? list.filter(predicate) : []
}

/**
 * Validate API response shape for list data.
 */
export function safeArrayFromResponse<T>(
  response: { data?: unknown } | null | undefined
): T[] {
  const data = response?.data
  return Array.isArray(data) ? (data as T[]) : []
}

/**
 * Extract items with default from response.
 */
export function extractItems<T>(
  response: { data?: T[]; items?: T[] } | null | undefined,
  defaultItems: T[] = []
): T[] {
  const list = response?.data ?? response?.items ?? defaultItems
  return Array.isArray(list) ? list : defaultItems
}

/**
 * Extract count with default.
 */
export function extractCount(
  response: { count?: number; total?: number } | null | undefined,
  defaultCount = 0
): number {
  const count = response?.count ?? response?.total ?? defaultCount
  return typeof count === 'number' ? count : defaultCount
}
