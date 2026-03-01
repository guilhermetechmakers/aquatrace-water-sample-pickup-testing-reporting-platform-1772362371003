/**
 * VersionSwitcher - Navigate through report versions with difference indicators
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReportVersion } from '@/types/reports'

export interface VersionSwitcherProps {
  versions: ReportVersion[]
  currentVersion: number
  onVersionChange: (version: number) => void
  className?: string
}

export function VersionSwitcher({
  versions,
  currentVersion,
  onVersionChange,
  className,
}: VersionSwitcherProps) {
  const safeVersions = Array.isArray(versions) ? versions : []
  const sorted = [...safeVersions].sort((a, b) => b.version - a.version)
  const currentIndex = sorted.findIndex((v) => v.version === currentVersion)
  const hasPrev = currentIndex >= 0 && currentIndex < sorted.length - 1
  const hasNext = currentIndex > 0

  if (sorted.length <= 1) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-sm text-muted-foreground">Version</span>
        <Badge variant="secondary">v{currentVersion}</Badge>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => hasNext && onVersionChange(sorted[currentIndex - 1]?.version ?? currentVersion)}
        disabled={!hasNext}
        aria-label="Previous version"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-1">
        {sorted.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onVersionChange(v.version)}
            className={cn(
              'rounded px-2 py-1 text-sm font-medium transition-colors',
              v.version === currentVersion
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            v{v.version}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => hasPrev && onVersionChange(sorted[currentIndex + 1]?.version ?? currentVersion)}
        disabled={!hasPrev}
        aria-label="Next version"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
