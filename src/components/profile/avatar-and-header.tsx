import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface AvatarAndHeaderProps {
  displayName?: string | null
  role?: string | null
  avatarUrl?: string | null
  isLoading?: boolean
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function AvatarAndHeader({
  displayName,
  role,
  avatarUrl,
  isLoading = false,
  className,
}: AvatarAndHeaderProps) {
  const safeName = displayName ?? 'User'
  const safeRole = role ?? 'User'

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6', className)}>
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6', className)}>
      <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
        <AvatarImage src={avatarUrl ?? undefined} alt={safeName} />
        <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{safeName}</h1>
        <Badge variant="secondary" className="font-medium">
          {safeRole}
        </Badge>
      </div>
    </div>
  )
}
