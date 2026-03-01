import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Droplets } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Droplets className="h-10 w-10 text-white" />
          <span className="text-2xl font-bold text-white">AquaTrace</span>
        </Link>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Streamline water sample pickup, testing & reporting
          </h2>
          <p className="text-white/90 text-lg">
            Replace paper workflows with an audit-ready, secure system. Reduce errors and turnaround time while enabling compliance and traceability.
          </p>
        </div>
        <p className="text-white/70 text-sm">
          © {new Date().getFullYear()} AquaTrace. All rights reserved.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <Droplets className="h-10 w-10 text-primary" />
              <span className="text-2xl font-bold text-foreground">AquaTrace</span>
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
