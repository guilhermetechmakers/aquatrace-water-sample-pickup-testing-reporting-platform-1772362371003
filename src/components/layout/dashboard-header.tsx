/**
 * Dashboard header with global search bar
 * Navigates to appropriate pages when suggestion is selected
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/search'
import type { AutocompleteSuggestion } from '@/types/search'

export function DashboardHeader() {
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()

  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setSearchValue('')
    const type = suggestion.type as string
    switch (type) {
      case 'samples':
        navigate(`/dashboard/pickups/samples?q=${encodeURIComponent(suggestion.label)}`)
        break
      case 'reports':
        navigate(`/dashboard/search?type=reports&q=${encodeURIComponent(suggestion.label)}`)
        break
      case 'customers':
        navigate(`/dashboard/search?type=customers&q=${encodeURIComponent(suggestion.label)}`)
        break
      case 'invoices':
        navigate(`/dashboard/search?type=invoices&q=${encodeURIComponent(suggestion.label)}`)
        break
      default:
        navigate(`/dashboard/search?q=${encodeURIComponent(suggestion.label)}`)
    }
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/dashboard/search?q=${encodeURIComponent(query.trim())}`)
      setSearchValue('')
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-8">
        <div className="flex-1 max-w-xl">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSelectSuggestion={handleSelectSuggestion}
            onSearch={handleSearch}
            placeholder="Search samples, reports, customers..."
            entityTypes={['samples', 'reports', 'customers', 'invoices']}
          />
        </div>
      </div>
    </header>
  )
}
