import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
          toast.success('Signed in successfully')
          navigate('/dashboard', { replace: true })
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
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8">
        <p className="text-destructive text-center">{error}</p>
        <Link to="/login" className="text-primary hover:underline">
          Return to login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground">Completing sign-in...</p>
    </div>
  )
}
