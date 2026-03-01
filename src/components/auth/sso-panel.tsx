import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Building2 } from 'lucide-react'

const AUTH0_ENABLED = Boolean(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
)

export function SSOPanel() {
  const handleAuth0Login = () => {
    if (!AUTH0_ENABLED) return
    const domain = import.meta.env.VITE_AUTH0_DOMAIN
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    const scope = encodeURIComponent('openid profile email')
    window.location.href = `https://${domain}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
  }

  if (!AUTH0_ENABLED) {
    return null
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Enterprise SSO
        </CardTitle>
        <CardDescription>
          Sign in with your organization&apos;s account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleAuth0Login}
          aria-label="Sign in with Auth0"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Sign in with SSO
        </Button>
      </CardContent>
    </Card>
  )
}

export function SSODivider() {
  if (!AUTH0_ENABLED) return null

  return (
    <div className="relative my-4">
      <Separator />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
        or continue with
      </span>
    </div>
  )
}
