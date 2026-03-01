import {
  Droplets,
  FlaskConical,
  CheckSquare,
  DollarSign,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const metrics = [
  { label: 'Samples Today', value: '24', icon: Droplets, trend: '+12%', color: 'text-primary' },
  { label: 'In Lab Queue', value: '8', icon: FlaskConical, trend: '-3', color: 'text-accent' },
  { label: 'Pending Approval', value: '5', icon: CheckSquare, trend: '2 overdue', color: 'text-warning' },
  { label: 'AR Outstanding', value: '$12,450', icon: DollarSign, trend: '-8%', color: 'text-success' },
]

const chartData = [
  { name: 'Mon', samples: 18, reports: 12 },
  { name: 'Tue', samples: 22, reports: 18 },
  { name: 'Wed', samples: 19, reports: 15 },
  { name: 'Thu', samples: 25, reports: 20 },
  { name: 'Fri', samples: 24, reports: 22 },
]

export function DashboardOverview() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          System health and key metrics at a glance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{m.trend}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Samples & Reports (7 days)</CardTitle>
            <CardDescription>Weekly activity trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSamples" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="samples"
                    stroke="rgb(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorSamples)"
                    name="Samples"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest sample updates</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {[
                { id: 'SMP-2024-001', action: 'Approved', time: '2 min ago', status: 'approved' as const },
                { id: 'SMP-2024-002', action: 'In Lab', time: '15 min ago', status: 'pending' as const },
                { id: 'SMP-2024-003', action: 'Collected', time: '1 hr ago', status: 'pending' as const },
              ].map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.id}</p>
                      <p className="text-sm text-muted-foreground">{item.action} · {item.time}</p>
                    </div>
                  </div>
                  <Badge variant={item.status === 'approved' ? 'approved' : 'pending'}>
                    {item.action}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
