import { Outlet } from 'react-router-dom'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalSupportProvider, usePortalSupport } from '@/contexts/portal-support-context'
import { SupportRequestDialog } from '@/components/portal/support-request-dialog'

function PortalLayoutInner() {
  const support = usePortalSupport()
  return (
    <div className="min-h-screen bg-background">
      <PortalHeader onSupportClick={support?.openSupport} />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      {support && (
        <SupportRequestDialog
          open={support.supportOpen}
          onOpenChange={support.setSupportOpen}
        />
      )}
    </div>
  )
}

export function PortalLayout() {
  return (
    <PortalSupportProvider>
      <PortalLayoutInner />
    </PortalSupportProvider>
  )
}
