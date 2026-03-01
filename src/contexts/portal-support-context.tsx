/**
 * PortalSupportContext - Allows header to open support dialog from anywhere in portal
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface PortalSupportContextValue {
  supportOpen: boolean
  setSupportOpen: (open: boolean) => void
  openSupport: () => void
}

const PortalSupportContext = createContext<PortalSupportContextValue | null>(null)

export function PortalSupportProvider({ children }: { children: ReactNode }) {
  const [supportOpen, setSupportOpen] = useState(false)
  const openSupport = useCallback(() => setSupportOpen(true), [])
  return (
    <PortalSupportContext.Provider value={{ supportOpen, setSupportOpen, openSupport }}>
      {children}
    </PortalSupportContext.Provider>
  )
}

export function usePortalSupport() {
  const ctx = useContext(PortalSupportContext)
  return ctx
}
