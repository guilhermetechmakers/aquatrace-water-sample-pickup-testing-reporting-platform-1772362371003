import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <AlertTriangle className="h-24 w-24 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-bold tracking-tight">500</h1>
        <p className="text-xl text-muted-foreground mt-2">Something went wrong</p>
        <p className="text-muted-foreground mt-2 max-w-md">
          We&apos;re sorry, but something unexpected happened. Please try again later.
        </p>
        <Link to="/" className="inline-block mt-8">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}
