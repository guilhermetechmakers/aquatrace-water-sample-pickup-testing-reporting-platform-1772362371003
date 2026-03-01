import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Auth0 OIDC callback handler.
 * Exchanges authorization code for tokens and redirects to dashboard.
 * Configure Auth0 redirect URI: https://your-app/auth/callback
 */
export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN
    const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID

    if (!code || !auth0Domain || !auth0ClientId) {
      setError('Invalid callback. Missing code or Auth0 configuration.')
      return
    }

    const redirectUri = `${window.location.origin}/auth/callback`
    const tokenUrl = `https://${auth0Domain}/oauth/token`

    fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: auth0ClientId,
        code,
        redirect_uri: redirectUri,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error_description ?? data.error)
        if (data.access_token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', data.access_token)
          }
          toast.success('Signed in successfully. Redirecting to dashboard…')
          // Brief delay so toast is visible before navigation
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 300)
        } else {
          throw new Error('No access token received')
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'SSO sign-in failed'
        setError(message)
        toast.error(message)
      })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div
        className="flex min-h-[280px] flex-col items-center justify-center p-4 sm:p-6 md:p-8"
        aria-live="assertive"
      >
        <Card className="w-full max-w-md animate-fade-in">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl">
              Sign-in failed
            </CardTitle>
            <CardDescription>
              There was a problem completing your sign-in. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="border-destructive/50">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription id="auth-callback-error">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full" size="lg">
              <Link
                to="/login"
                aria-label="Return to login page to try again"
              >
                Return to login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center gap-6 p-4 sm:p-6 md:p-8"
      role="status"
      aria-live="polite"
      aria-label="Completing sign-in"
    >
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="flex flex-col items-center gap-6 py-12">
          <Loader2
            className="h-12 w-12 animate-spin text-primary"
            aria-hidden
          />
          <div className="space-y-1 text-center">
            <p className="text-base font-medium text-foreground">
              Completing sign-in…
            </p>
            <p className="text-sm text-muted-foreground">
              Please wait while we redirect you to your dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
