import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link to="/" className="font-semibold">AquaTrace</Link>
          <Link to="/" className="ml-auto">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mt-2">Last updated: March 2024</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              By accessing or using AquaTrace, you agree to be bound by these Terms of Service. 
              If you do not agree, please do not use our services.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Service Description</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              AquaTrace provides a SaaS platform for water sample pickup, lab testing workflows, 
              approval management, PDF report generation, and billing. Use of the service is subject to 
              your subscription plan and applicable laws.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
