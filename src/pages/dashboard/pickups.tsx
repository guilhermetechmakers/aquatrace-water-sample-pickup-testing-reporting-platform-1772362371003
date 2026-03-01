import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MapPin,
  Camera,
  Droplets,
  Gauge,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/auth-context'
import { useRBAC } from '@/hooks/useRBAC'
import {
  fetchPickups,
  updatePickup,
  addPickupReadings,
  addPickupPhotos,
  uploadPickupPhoto,
} from '@/api/pickups'
import type { Pickup } from '@/types/rbac'
import { cn } from '@/lib/utils'

function getGeoLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err)
    )
  })
}

export function PickupsPage() {
  const { user } = useAuth()
  const { hasPermission } = useRBAC()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null)
  const [readingsOpen, setReadingsOpen] = useState(false)
  const [ph, setPh] = useState('')
  const [chlorine, setChlorine] = useState('')
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const technicianId = user?.id
  const canManage = hasPermission('pickup', 'update') || hasPermission('pickup', 'create')

  const { data: pickups = [], isLoading } = useQuery({
    queryKey: ['pickups', technicianId],
    queryFn: () => fetchPickups(technicianId),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pickup> }) =>
      updatePickup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] })
      toast.success('Pickup updated')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  const addReadingsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPickup) return
      const pHNum = parseFloat(ph)
      const chlorineNum = parseFloat(chlorine)
      if (isNaN(pHNum) || isNaN(chlorineNum)) {
        throw new Error('Invalid readings')
      }
      await addPickupReadings(selectedPickup.id, { pH: pHNum, chlorine: chlorineNum })
    },
    onSuccess: () => {
      toast.success('Readings saved')
      setReadingsOpen(false)
      setPh('')
      setChlorine('')
      setSelectedPickup(null)
      queryClient.invalidateQueries({ queryKey: ['pickups'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save'),
  })

  const addPhotosMutation = useMutation({
    mutationFn: async ({ pickupId, files }: { pickupId: string; files: FileList }) => {
      const urls: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file?.type.startsWith('image/')) {
          const url = await uploadPickupPhoto(pickupId, file)
          urls.push(url)
        }
      }
      if (urls.length > 0) await addPickupPhotos(pickupId, urls)
    },
    onSuccess: () => {
      setUploadingForId(null)
      queryClient.invalidateQueries({ queryKey: ['pickups'] })
      toast.success('Photos uploaded')
    },
    onError: (err) => {
      setUploadingForId(null)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    },
  })

  const handlePhotoClick = (pickup: Pickup) => {
    if (!canManage) return
    fileInputRef.current?.click()
    setSelectedPickup(pickup)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !selectedPickup) return
    setUploadingForId(selectedPickup.id)
    addPhotosMutation.mutate({ pickupId: selectedPickup.id, files })
    e.target.value = ''
    setSelectedPickup(null)
  }

  const handleCaptureLocation = async (pickup: Pickup) => {
    try {
      const { lat, lng } = await getGeoLocation()
      updateMutation.mutate({
        id: pickup.id,
        updates: { gps_lat: lat, gps_lng: lng },
      })
    } catch {
      toast.error('Could not get location. Check permissions.')
    }
  }

  const handleStartPickup = (pickup: Pickup) => {
    updateMutation.mutate({
      id: pickup.id,
      updates: { status: 'in_progress' },
    })
  }

  const handleCompletePickup = (pickup: Pickup) => {
    updateMutation.mutate({
      id: pickup.id,
      updates: { status: 'completed' },
    })
  }

  const handleAddReadings = (pickup: Pickup) => {
    setSelectedPickup(pickup)
    setPh(String(pickup.readings?.pH ?? ''))
    setChlorine(String(pickup.readings?.chlorine ?? ''))
    setReadingsOpen(true)
  }

  if (!hasPermission('pickup', 'read') && !hasPermission('pickup', 'create')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view pickups.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Pickups</h1>
          <p className="text-muted-foreground mt-1">
            Assigned sample pickups — capture GPS, readings, and photos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-2 text-sm',
              isOnline ? 'text-success' : 'text-muted-foreground'
            )}
            title={isOnline ? 'Connected' : 'Offline — changes will sync when back online'}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Assigned Pickups
          </CardTitle>
          <CardDescription>
            Tap to start, add readings, capture GPS and photos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(pickups ?? []).map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border p-4 transition-all hover:shadow-card hover:border-primary/20"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-medium">{p.id.slice(0, 12)}...</p>
                        <Badge
                          variant={
                            p.status === 'completed'
                              ? 'success'
                              : p.status === 'in_progress'
                                ? 'accent'
                                : 'pending'
                          }
                        >
                          {p.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {p.location}
                      </p>
                      {(p.readings?.pH != null || p.readings?.chlorine != null) ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          pH: {String(p.readings?.pH ?? '—')} · Chlorine: {String(p.readings?.chlorine ?? '—')}
                        </p>
                      ) : null}
                      {Array.isArray(p.photos) && p.photos.length > 0 ? (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {p.photos.slice(0, 3).map((url, i) => (
                            <img
                              key={`${p.id}-photo-${i}`}
                              src={url}
                              alt={`Sample ${i + 1}`}
                              className="h-12 w-12 rounded object-cover border border-border"
                            />
                          ))}
                          {p.photos.length > 3 ? (
                            <span className="text-xs text-muted-foreground self-center">
                              +{p.photos.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        {p.status === 'scheduled' && (
                          <Button size="sm" onClick={() => handleStartPickup(p)}>
                            Start
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCaptureLocation(p)}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          GPS
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddReadings(p)}
                        >
                          <Gauge className="h-4 w-4 mr-1" />
                          Readings
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePhotoClick(p)}
                          disabled={uploadingForId === p.id}
                        >
                          {uploadingForId === p.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4 mr-1" />
                          )}
                          Photo
                        </Button>
                        {p.status === 'in_progress' && (
                          <Button size="sm" onClick={() => handleCompletePickup(p)}>
                            Complete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(pickups ?? []).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pickups assigned</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={readingsOpen} onOpenChange={setReadingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Readings</DialogTitle>
            <DialogDescription>
              Enter pH and Chlorine levels for this pickup
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ph">pH</Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={ph}
                onChange={(e) => setPh(e.target.value)}
                placeholder="7.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chlorine">Chlorine (ppm)</Label>
              <Input
                id="chlorine"
                type="number"
                step="0.1"
                min="0"
                value={chlorine}
                onChange={(e) => setChlorine(e.target.value)}
                placeholder="1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadingsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addReadingsMutation.mutate()}
              disabled={addReadingsMutation.isPending || !ph || !chlorine}
            >
              {addReadingsMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
