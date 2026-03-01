import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Droplets, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PortalLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/portal" className="flex items-center gap-2">
            <Droplets className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AquaTrace</span>
          </Link>
          <Button variant="ghost" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
