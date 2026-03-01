import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSidebar } from '@/contexts/sidebar-context'
import { useAuth } from '@/contexts/auth-context'
import {
  LayoutDashboard,
  Droplets,
  FlaskConical,
  CheckSquare,
  FileText,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  MapPin,
  Shield,
  UserCog,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const allNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/pickups', icon: MapPin, label: 'My Pickups', roles: ['TECHNICIAN'] },
  { to: '/dashboard/samples', icon: Droplets, label: 'Samples', roles: ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/lab', icon: FlaskConical, label: 'Lab Queue', roles: ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/approvals', icon: CheckSquare, label: 'Approvals', roles: ['LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/reports', icon: FileText, label: 'Reports', roles: ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/customers', icon: Users, label: 'Customers', roles: ['LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/invoicing', icon: DollarSign, label: 'Invoicing', roles: ['LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', roles: ['LAB_MANAGER', 'ADMIN'] },
  { to: '/dashboard/admin', icon: Shield, label: 'Admin', roles: ['ADMIN'] },
  { to: '/dashboard/users', icon: UserCog, label: 'Users', roles: ['ADMIN'] },
  { to: '/dashboard/audit', icon: FileCheck, label: 'Audit Log', roles: ['ADMIN'] },
]

export function DashboardSidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const { signOut, user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const navItems = useMemo(() => {
    const role = user?.role ?? ''
    return allNavItems.filter((item) => item.roles.includes(role))
  }, [user?.role])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            {!collapsed && (
              <Link to="/dashboard" className="flex items-center gap-2">
                <Droplets className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">AquaTrace</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {(navItems ?? []).map((item) => {
              const isActive = location.pathname === item.to
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          <Separator />
          <div className="space-y-1 p-4">
            <Link
              to="/dashboard/profile"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                (location.pathname === '/dashboard/profile' || location.pathname === '/dashboard/settings') && 'bg-secondary text-foreground'
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Profile</span>}
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
      </aside>
    </>
  )
}
