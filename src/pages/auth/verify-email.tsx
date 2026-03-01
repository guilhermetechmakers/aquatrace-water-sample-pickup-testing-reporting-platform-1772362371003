import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured() || !tokenHash || type !== 'email') {
      setVerified(false)
      return
    }

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'email' })
      .then(({ error }) => {
        setVerified(!error)
        if (error) toast.error(error.message)
      })
      .catch(() => setVerified(false))
  }, [tokenHash, type])

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: new URLSearchParams(window.location.search).get('email') ?? '',
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Verification email sent')
      setResendCooldown(60)
    } catch {
      toast.error('Failed to resend')
    } finally {
      setIsResending(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const showVerified = verified === true
  const showPending = verified === false || verified === null

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        {showVerified ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Email verified</CardTitle>
            <CardDescription>
              Your account has been verified. You can now log in.
            </CardDescription>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a verification link to your email. Click the link to verify your account.
            </CardDescription>
            {showPending && (
              <Badge variant="secondary" className="mx-auto w-fit">
                Pending verification
              </Badge>
            )}
          </>
        )}
      </CardHeader>
      <CardContent className="text-center">
        {showPending && (
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or click below to resend.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {showVerified ? (
          <Link to="/login" className="w-full">
            <Button className="w-full">Log in</Button>
          </Link>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : isResending
                  ? 'Sending...'
                  : 'Resend verification email'}
            </Button>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
