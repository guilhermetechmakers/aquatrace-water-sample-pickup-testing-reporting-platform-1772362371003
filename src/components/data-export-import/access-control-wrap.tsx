/**
 * AccessControlWrap - Enforces role-based access for data export/import
 */

import { useRBAC } from '@/hooks/useRBAC'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldX } from 'lucide-react'

interface AccessControlWrapProps {
  children: React.ReactNode
  resource?: 'data_export_import'
  action?: 'read' | 'execute'
  fallback?: React.ReactNode
}

export function AccessControlWrap({
  children,
  resource = 'data_export_import',
  action = 'read',
  fallback,
}: AccessControlWrapProps) {
  const { hasPermission } = useRBAC()
  const allowed = hasPermission(resource, action)

  if (!allowed) {
    if (fallback) return <>{fallback}</>
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You do not have permission to access Data Export & Import. Admin or Lab Manager role is required.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
