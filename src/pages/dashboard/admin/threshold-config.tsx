/**
 * Threshold Configuration - Admin UI
 * Per customer/site SPC and Total Coliform thresholds, units, allowed methods
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings, ArrowLeft, Save, Loader2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  useThresholds,
  useCreateThreshold,
  useUpdateThreshold,
} from '@/hooks/useLabResultsEntry'
import { useRBAC } from '@/hooks/useRBAC'
import { toast } from 'sonner'
import {
  SPC_UNITS,
  TC_UNITS,
  DETECTION_METHODS,
} from '@/types/lab-results-entry'

export function ThresholdConfigPage() {
  const { hasPermission } = useRBAC()
  const { data: threshold, isLoading } = useThresholds(undefined, undefined)
  const createThreshold = useCreateThreshold()
  const updateThreshold = useUpdateThreshold()

  const [spcMin, setSpcMin] = useState<string>('')
  const [spcMax, setSpcMax] = useState<string>('')
  const [tcMin, setTcMin] = useState<string>('')
  const [tcMax, setTcMax] = useState<string>('')
  const [spcUnit, setSpcUnit] = useState('CFU/mL')
  const [tcUnit, setTcUnit] = useState('CFU/100mL')
  const [selectedThresholdId, setSelectedThresholdId] = useState<string>('')

  useEffect(() => {
    if (threshold) {
      setSpcMin(threshold.spcMin != null ? String(threshold.spcMin) : '')
      setSpcMax(threshold.spcMax != null ? String(threshold.spcMax) : '')
      setTcMin(threshold.tcMin != null ? String(threshold.tcMin) : '')
      setTcMax(threshold.tcMax != null ? String(threshold.tcMax) : '')
      setSpcUnit(threshold.spcUnit ?? 'CFU/mL')
      setTcUnit(threshold.tcUnit ?? 'CFU/100mL')
      setSelectedThresholdId(threshold.id ?? '')
    }
  }, [threshold])

  const handleSave = () => {
    const payload = {
      customerId: null,
      siteId: null,
      spcMin: spcMin === '' ? null : parseFloat(spcMin),
      spcMax: spcMax === '' ? null : parseFloat(spcMax),
      tcMin: tcMin === '' ? null : parseFloat(tcMin),
      tcMax: tcMax === '' ? null : parseFloat(tcMax),
      spcUnit,
      tcUnit,
      allowedMethods: [...DETECTION_METHODS] as string[],
    }
    if (selectedThresholdId) {
      updateThreshold.mutate(
        { id: selectedThresholdId, input: payload },
        {
          onSuccess: () => toast.success('Thresholds updated'),
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
        }
      )
    } else {
      createThreshold.mutate(
        { ...payload, effectiveFrom: new Date().toISOString(), effectiveTo: null },
        {
          onSuccess: () => toast.success('Thresholds created'),
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Create failed'),
        }
      )
    }
  }

  if (!hasPermission('admin_ui', 'read') && !hasPermission('lab_results', 'execute')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin access required for threshold configuration.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Threshold Configuration</h1>
          <p className="text-sm text-muted-foreground">
            SPC and Total Coliform bounds per customer/site
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Default Thresholds
          </CardTitle>
          <CardDescription>
            Values outside these ranges will be flagged for manager review. Leave blank for no limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted/50" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="spcMin" className="flex items-center gap-1">
                    SPC Min
                    <span title="Minimum allowed SPC value" aria-label="Help">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Label>
                  <Input
                    id="spcMin"
                    type="number"
                    placeholder="No minimum"
                    value={spcMin}
                    onChange={(e) => setSpcMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spcMax">SPC Max</Label>
                  <Input
                    id="spcMax"
                    type="number"
                    placeholder="No maximum"
                    value={spcMax}
                    onChange={(e) => setSpcMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spcUnit">SPC Unit</Label>
                <select
                  id="spcUnit"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={spcUnit}
                  onChange={(e) => setSpcUnit(e.target.value)}
                >
                  {(SPC_UNITS as readonly string[]).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tcMin">Total Coliform Min</Label>
                  <Input
                    id="tcMin"
                    type="number"
                    placeholder="No minimum"
                    value={tcMin}
                    onChange={(e) => setTcMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tcMax">Total Coliform Max</Label>
                  <Input
                    id="tcMax"
                    type="number"
                    placeholder="No maximum"
                    value={tcMax}
                    onChange={(e) => setTcMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tcUnit">Total Coliform Unit</Label>
                <select
                  id="tcUnit"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tcUnit}
                  onChange={(e) => setTcUnit(e.target.value)}
                >
                  {(TC_UNITS as readonly string[]).map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSave} disabled={createThreshold.isPending || updateThreshold.isPending}>
                {createThreshold.isPending || updateThreshold.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Thresholds
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
