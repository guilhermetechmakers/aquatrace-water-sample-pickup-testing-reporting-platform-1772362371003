import { useState } from 'react'
import { Search, Filter, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const mockSamples = [
  { id: 'SMP-2024-001', site: 'Building A', status: 'approved', date: '2024-03-01' },
  { id: 'SMP-2024-002', site: 'Building B', status: 'in_lab', date: '2024-03-01' },
  { id: 'SMP-2024-003', site: 'Building C', status: 'pending', date: '2024-02-28' },
]

const statusVariant = {
  pending: 'pending' as const,
  in_lab: 'secondary' as const,
  tested: 'accent' as const,
  approved: 'approved' as const,
  rejected: 'rejected' as const,
}

export function SamplesPage() {
  const [search, setSearch] = useState('')
  const [loading] = useState(false)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Samples</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track water samples
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Sample
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search samples..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Sample ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Site</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                    <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSamples.map((s) => (
                    <tr key={s.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="p-4 font-mono text-sm">{s.id}</td>
                      <td className="p-4">{s.site}</td>
                      <td className="p-4">
                        <Badge variant={statusVariant[s.status as keyof typeof statusVariant] ?? 'secondary'}>
                          {s.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{s.date}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {mockSamples.length} samples
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
