import { Link } from 'react-router-dom'
import { HelpCircle, Book, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const faqs = [
  { q: 'How do I add a new sample?', a: 'Use the Scan Sample button on the Technician Dashboard to capture a new sample. You can scan the QR/barcode or enter the sample ID manually.' },
  { q: 'How does offline sync work?', a: 'The technician app stores data locally when offline. When connectivity returns, changes sync automatically with exponential backoff retry.' },
  { q: 'How do I approve lab results?', a: 'Go to the Approval Queue, review the submission, and use Approve or Request Changes. Electronic signature is captured on approval.' },
]

export function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span className="font-semibold">Help Center</span>
          </Link>
          <Link to="/" className="ml-auto">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground mt-2">
            FAQ, setup guides, and contact support
          </p>

          <div className="mt-12 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Book className="h-5 w-5" />
              Frequently Asked Questions
            </h2>
            {faqs.map((faq, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need more help? Reach out to our support team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">support@aquatrace.com</p>
              <Button>Contact Support</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
