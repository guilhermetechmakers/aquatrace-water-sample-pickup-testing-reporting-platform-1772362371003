/**
 * Saved Searches management modal
 * Save, load, delete saved searches with user-scoped access
 */

import { useState } from 'react'
import { Bookmark, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  useSavedSearches,
  useCreateSavedSearch,
  useDeleteSavedSearch,
} from '@/hooks/useSearch'
import type { SavedSearch, SearchFilters, SearchEntityType } from '@/types/search'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export interface SavedSearchManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadSearch: (search: SavedSearch) => void
  currentFilters?: SearchFilters
  currentQuery?: string
  currentType?: SearchEntityType
}

export function SavedSearchManager({
  open,
  onOpenChange,
  onLoadSearch,
  currentFilters = {},
  currentQuery = '',
  currentType = 'samples',
}: SavedSearchManagerProps) {
  const [saveName, setSaveName] = useState('')
  const { data: savedList = [], isLoading } = useSavedSearches(currentType)
  const createMutation = useCreateSavedSearch()
  const deleteMutation = useDeleteSavedSearch()

  const savedSearches = Array.isArray(savedList) ? savedList : []

  const handleSave = () => {
    const name = saveName.trim()
    if (!name) {
      toast.error('Enter a name for this search')
      return
    }
    createMutation.mutate(
      {
        name,
        type: currentType,
        query: currentQuery || undefined,
        filters: Object.keys(currentFilters).length > 0 ? currentFilters : undefined,
        sortBy: 'updated_at',
        sortDir: 'desc',
      },
      {
        onSuccess: () => {
          toast.success('Search saved')
          setSaveName('')
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to save')
        },
      }
    )
  }

  const handleLoad = (s: SavedSearch) => {
    onLoadSearch(s)
    onOpenChange(false)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Search deleted'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Searches
          </DialogTitle>
          <DialogDescription>
            Save your current filters and query for quick access later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-name">Save current search</Label>
            <div className="flex gap-2">
              <Input
                id="save-name"
                placeholder="e.g. Pending samples this week"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || !saveName.trim()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your saved searches</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedSearches.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No saved searches yet. Save your current filters to get started.
              </p>
            ) : (
              <ul className="space-y-1 rounded-lg border divide-y">
                {savedSearches.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
                    )}
                    onClick={() => handleLoad(s)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleLoad(s)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {s.type}
                      </span>
                      {s.query && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          &quot;{s.query}&quot;
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDelete(s.id, e)}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete saved search"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
