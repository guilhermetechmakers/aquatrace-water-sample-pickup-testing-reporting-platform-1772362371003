/**
 * Runtime safety utilities for data handling
 * Guards against null/undefined and invalid array shapes
 */

/**
 * Safely map over an array. Returns empty array if input is null/undefined or not an array.
 */
export function safeArrayMap<T, U>(
  items: T[] | null | undefined,
  fn: (item: T, index: number) => U
): U[] {
  const list = Array.isArray(items) ? items : (items ?? [])
  return Array.isArray(list) ? list.map(fn) : []
}

/**
 * Safely get array from API response.
 */
export function safeArrayFromResponse<T>(
  response: { data?: T[] | null } | null | undefined
): T[] {
  const data = response?.data
  return Array.isArray(data) ? data : []
}

/**
 * Safely get items with nullish coalescing.
 */
export function safeItems<T>(items: T[] | null | undefined): T[] {
  return items ?? []
}
