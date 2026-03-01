import { Link } from 'react-router-dom'
import { CheckCircle, Mail } from 'lucide-react'
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

export function VerifyEmailPage() {
  const verified = false

  return (
    <Card className="animate-fade-in">
      <CardHeader className="text-center">
        {verified ? (
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
            <Badge variant="secondary" className="w-fit mx-auto">Pending verification</Badge>
          </>
        )}
      </CardHeader>
      <CardContent className="text-center">
        {!verified && (
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or click below to resend.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {verified ? (
          <Link to="/login" className="w-full">
            <Button className="w-full">Log in</Button>
          </Link>
        ) : (
          <>
            <Button variant="outline" className="w-full">Resend verification email</Button>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
