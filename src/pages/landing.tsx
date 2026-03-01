import { Link } from 'react-router-dom'
import {
  Droplets,
  Smartphone,
  FlaskConical,
  CheckSquare,
  FileText,
  CreditCard,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Smartphone,
    title: 'Technician App',
    description: 'Mobile-first pickup with QR/barcode scanning, GPS capture, pH & chlorine readings, and offline sync.',
  },
  {
    icon: FlaskConical,
    title: 'Lab Workflows',
    description: 'Streamlined result entry with SPC/Total Coliform validation, attachments, and batch import.',
  },
  {
    icon: CheckSquare,
    title: 'Approvals & Audit',
    description: 'Electronic signatures, approval queue, and immutable audit trail for compliance.',
  },
  {
    icon: FileText,
    title: 'PDF Reports',
    description: 'Auto-generated signed reports with pickup data, lab results, and secure distribution.',
  },
  {
    icon: CreditCard,
    title: 'Billing & Invoicing',
    description: 'Integrated billing tied to sample lifecycle with Stripe payments and AR workflows.',
  },
]

const steps = [
  { step: 1, title: 'Capture', desc: 'Technicians scan, log readings, and sync from the field.' },
  { step: 2, title: 'Process', desc: 'Lab enters results; managers approve with e-signatures.' },
  { step: 3, title: 'Deliver', desc: 'PDFs auto-generate and reach customers via portal or email.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Droplets className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">AquaTrace</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="container relative mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl animate-fade-in-up">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Water Sample
              </span>
              <br />
              Pickup, Testing & Reporting
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Replace paper workflows with an audit-ready, secure, offline-capable system. 
              Reduce errors by 90% and turnaround time by 40%.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/signup">
                <Button size="xl" className="w-full sm:w-auto group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Schedule Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Features Overview</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to digitize water testing from pickup through billing.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = f.icon
                return (
                  <Card key={f.title} className="animate-fade-in-up hover:shadow-card-hover transition-all duration-300" style={{ animationDelay: `${i * 0.05}s` }}>
                    <CardHeader>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle>{f.title}</CardTitle>
                      <CardDescription>{f.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Three simple steps from field to customer.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.step} className="relative text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-0.5 bg-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple Pricing</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Plans that scale with your lab.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
              <Card className="animate-fade-in-up">
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>For small labs getting started</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Up to 500 samples/month</li>
                    <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-success" /> 5 users</li>
                    <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-success" /> Basic analytics</li>
                  </ul>
                  <Link to="/signup" className="block mt-6">
                    <Button variant="outline" className="w-full">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="animate-fade-in-up border-primary shadow-lg scale-105" style={{ animationDelay: '0.1s' }}>
                <CardHeader>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">Popular</span>
                  <CardTitle>Professional</CardTitle>
                  <CardDescription>For growing labs</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$299</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Up to 2,000 samples/month</li>
                    <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-success" /> 20 users</li>
                    <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-success" /> Advanced analytics</li>
                    <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-success" /> Custom report templates</li>
                  </ul>
                  <Link to="/signup" className="block mt-6">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For large organizations</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">Custom</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Unlimited samples</li>
                    <li className="flex items-center gap-2"><Zap className="h-4 w-4 text-success" /> Unlimited users</li>
                    <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-success" /> Full analytics & export</li>
                    <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-success" /> SSO, API access</li>
                  </ul>
                  <Link to="/signup" className="block mt-6">
                    <Button variant="outline" className="w-full">Contact Sales</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to streamline your workflow?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Join labs that have reduced errors and turnaround time with AquaTrace.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg">Start Free Trial</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">Log in</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Droplets className="h-6 w-6 text-primary" />
              <span className="font-semibold">AquaTrace</span>
            </div>
            <nav className="flex gap-8 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to="/help" className="hover:text-foreground transition-colors">Help</Link>
            </nav>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} AquaTrace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

