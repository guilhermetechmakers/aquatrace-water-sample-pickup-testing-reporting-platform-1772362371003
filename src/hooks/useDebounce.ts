/**
 * useDebouncedValue - Returns a debounced value for search/filter inputs
 */

import { useEffect, useState } from 'react'

/**
 * Debounce a value. Returns the value after delay ms of no changes.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
