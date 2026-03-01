/**
 * PortalHeader - Tenant branding, user menu, notifications
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, LogOut, Bell, ChevronDown, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { NotificationsPanel } from './notifications-panel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface PortalHeaderProps {
  onSupportClick?: () => void
}

export function PortalHeader({ onSupportClick }: PortalHeaderProps) {
  const { user, signOut } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/portal"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          aria-label="AquaTrace Home"
        >
          <Droplets className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">AquaTrace</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2"
                aria-label="User menu"
              >
                <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                  {user?.displayName ?? user?.email ?? 'Account'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/portal">Reports & Invoices</Link>
              </DropdownMenuItem>
              {onSupportClick && (
                <DropdownMenuItem onClick={onSupportClick}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {notificationsOpen && (
        <div className="absolute right-4 top-full mt-1">
          <NotificationsPanel
            onClose={() => setNotificationsOpen(false)}
            className="animate-fade-in"
          />
        </div>
      )}
    </header>
  )
}
