/**
 * Global Search Bar with autocomplete suggestions
 * Debounced input, keyboard navigation, suggestion fetch
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebounce'
import { fetchAutocompleteSuggestions } from '@/api/search'
import type { AutocompleteSuggestion, SearchEntityType } from '@/types/search'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 250

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSelectSuggestion?: (suggestion: AutocompleteSuggestion) => void
  onSuggestionSelect?: (suggestion: AutocompleteSuggestion) => void
  onSearch?: (query: string) => void
  placeholder?: string
  entityType?: SearchEntityType
  entityTypes?: SearchEntityType[]
  className?: string
  autoFocus?: boolean
  disabled?: boolean
}

export function SearchBar({
  value,
  onChange,
  onSelectSuggestion,
  onSuggestionSelect,
  onSearch,
  placeholder = 'Search samples, reports, customers...',
  entityType = 'samples',
  entityTypes,
  className,
  autoFocus = false,
  disabled = false,
}: SearchBarProps) {
  const onSelect = onSuggestionSelect ?? onSelectSuggestion
  const types = entityTypes ?? [entityType]
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebouncedValue(value, DEBOUNCE_MS)

  const fetchSuggestions = useCallback(async () => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([])
      return
    }
    setIsLoadingSuggestions(true)
    try {
      const list = await fetchAutocompleteSuggestions(debouncedQuery, types)
      const normalized = Array.isArray(list)
        ? list.map((s) => ({
            id: s.id,
            label: s.label,
            type: s.type,
            meta: s.subtitle ?? s.meta,
          }))
        : []
      setSuggestions(normalized)
      setHighlightIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [debouncedQuery, types])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter' && value.trim()) {
        onSearch?.(value.trim())
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = suggestions[highlightIndex >= 0 ? highlightIndex : 0]
      if (sel) {
        onSelect?.(sel)
        onChange(sel.label)
        setIsOpen(false)
      } else if (value.trim()) {
        onSearch?.(value.trim())
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }

  const handleSuggestionClick = (s: AutocompleteSuggestion) => {
    onSelect?.(s)
    onChange(s.label)
    setIsOpen(false)
  }

  const showSuggestions = isOpen && (suggestions.length > 0 || isLoadingSuggestions)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={
            highlightIndex >= 0 && suggestions[highlightIndex]
              ? `suggestion-${suggestions[highlightIndex]?.id}`
              : undefined
          }
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          disabled={disabled}
          className="pl-9 pr-9"
        />
        {isLoadingSuggestions && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {showSuggestions && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg animate-fade-in"
        >
          {isLoadingSuggestions ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Loading...</li>
          ) : suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">No suggestions</li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={`${s.type}-${s.id}`}
                id={`suggestion-${s.id}`}
                role="option"
                aria-selected={i === highlightIndex}
                className={cn(
                  'cursor-pointer px-4 py-2.5 text-sm transition-colors',
                  i === highlightIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                )}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSuggestionClick(s)
                }}
              >
                <span className="font-medium">{s.label}</span>
                {s.meta && (
                  <span className="ml-2 text-muted-foreground">{s.meta}</span>
                )}
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                  {s.type}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
