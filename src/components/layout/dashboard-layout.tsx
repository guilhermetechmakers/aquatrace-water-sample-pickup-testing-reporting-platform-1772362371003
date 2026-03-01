import { Outlet } from 'react-router-dom'
import { DashboardSidebar } from './dashboard-sidebar'
import { DashboardHeader } from './dashboard-header'
import { useSidebar } from '@/contexts/sidebar-context'

export function DashboardLayout() {
  const { collapsed } = useSidebar()
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className={`lg:transition-all lg:duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <DashboardHeader />
        <div className="min-h-screen p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
