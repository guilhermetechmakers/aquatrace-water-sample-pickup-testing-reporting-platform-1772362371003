/**
 * Sample Pickup Form (Technician)
 * Log each 100 mL vial pickup onsite with vialCount, pH, chlorineReading, siteId, photos, GPS
 * Sample Management Workflow - initial state: Pending Pickup
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, MapPin, ScanBarcode, Loader2, Building2, Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useCreatePickupSample, useAddPickupPhoto } from '@/hooks/usePickupSamples'
import { useSites } from '@/hooks/useSites'
import { generateId } from '@/lib/offline-storage'
import { createDraftPickup, updateDraftPickup } from '@/api/pickups'
import { BarcodeScanner } from '@/components/technician/barcode-scanner'
import { FileAttachmentUploader, AttachmentListView } from '@/components/attachments'
import { cn } from '@/lib/utils'

const schema = z.object({
  vialId: z.string().min(1, 'Vial ID is required'),
  siteId: z.string().min(1, 'Site is required'),
  vialCount: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(1, 'Vial count must be at least 1'),
  pH: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'pH must be 0–14')
    .max(14, 'pH must be 0–14')
    .nullable()
    .optional(),
  chlorineReading: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Chlorine must be 0–20 ppm')
    .max(20, 'Chlorine must be 0–20 ppm')
    .nullable()
    .optional(),
  pickupLocationName: z.string().optional(),
  customerSiteNotes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function getGeoLocation(): Promise<{
  lat: number
  lng: number
  accuracy: number
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        }),
      (err) => reject(err)
    )
  })
}

function generateSampleId(): string {
  return `SMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function SamplePickupFormPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [photos, setPhotos] = useState<Array<{ id: string; localUri: string }>>([])
  const [gps, setGps] = useState<{
    lat: number
    lng: number
    accuracy: number
  } | null>(null)
  const [isCapturingGps, setIsCapturingGps] = useState(false)
  const [sampleId] = useState(() => generateSampleId())
  const [draftPickupId, setDraftPickupId] = useState<string | null>(null)

  const createMutation = useCreatePickupSample()

  useEffect(() => {
    const technicianId = user?.id
    if (!technicianId) return
    createDraftPickup(technicianId).then((id) => {
      if (id) setDraftPickupId(id)
    })
  }, [user?.id])
  const addPhotoMutation = useAddPickupPhoto()
  const { data: sites = [], isLoading: sitesLoading } = useSites()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vialId: '',
      siteId: '',
      vialCount: 1,
      pH: undefined,
      chlorineReading: undefined,
      pickupLocationName: '',
      customerSiteNotes: '',
    },
  })

  const selectedSiteId = watch('siteId')
  const selectedSite = Array.isArray(sites) ? (sites ?? []).find((s) => s.id === selectedSiteId) : null

  const handleScan = (id: string) => {
    setValue('vialId', id)
    setScanOpen(false)
  }

  const handleCaptureGps = async () => {
    setIsCapturingGps(true)
    try {
      const loc = await getGeoLocation()
      setGps(loc)
      toast.success('Location captured')
    } catch {
      toast.error('Could not get location. Check permissions.')
    } finally {
      setIsCapturingGps(false)
    }
  }

  const handlePhotoCapture = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file?.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const uri = reader.result as string
          setPhotos((prev) => [...prev, { id: generateId(), localUri: uri }])
        }
        reader.readAsDataURL(file)
      }
    }
    e.target.value = ''
  }

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => (prev ?? []).filter((p) => p.id !== photoId))
  }

  const onSubmit = async (data: FormValues, action: 'draft' | 'submit') => {
    const technicianId = user?.id ?? ''
    if (!technicianId) {
      toast.error('You must be logged in')
      return
    }

    const pHNum = data.pH != null && data.pH !== undefined ? Number(data.pH) : null
    const chlorineNum =
      data.chlorineReading != null && data.chlorineReading !== undefined
        ? Number(data.chlorineReading)
        : null

    if (action === 'submit' && (pHNum == null || chlorineNum == null)) {
      toast.error('Please enter pH and Chlorine readings for submission')
      return
    }

    const siteName = selectedSite?.name ?? 'Site'
    const location = data.pickupLocationName?.trim() || siteName

    if (draftPickupId) {
      const status = action === 'submit' ? 'submitted' : 'draft'
      const ok = await updateDraftPickup(draftPickupId, {
        vialId: data.vialId.trim(),
        siteId: data.siteId.trim() || null,
        vialCount: data.vialCount ?? 1,
        sampleId,
        pH: pHNum,
        chlorine: chlorineNum,
        chlorineReading: chlorineNum,
        pickupLocationName: data.pickupLocationName?.trim() || null,
        customerSiteNotes: data.customerSiteNotes?.trim() || null,
        location,
        gpsLat: gps?.lat ?? null,
        gpsLon: gps?.lng ?? null,
        gpsAccuracy: gps?.accuracy ?? null,
        status,
      })
      if (ok) {
        toast.success(action === 'submit' ? 'Pickup submitted' : 'Draft saved')
        if (action === 'submit') navigate('/dashboard/pickups')
      } else {
        toast.error('Failed to save')
      }
      return
    }

    const now = new Date().toISOString()
    createMutation.mutate(
      {
        vialId: data.vialId.trim(),
        siteId: data.siteId.trim() || null,
        vialCount: data.vialCount ?? 1,
        sampleId,
        pH: pHNum,
        chlorine: chlorineNum,
        chlorineReading: chlorineNum,
        volume: 100,
        timestamp: now,
        gpsLat: gps?.lat ?? null,
        gpsLon: gps?.lng ?? null,
        gpsAccuracy: gps?.accuracy ?? null,
        customerSiteNotes: data.customerSiteNotes?.trim() || null,
        pickupLocationName: data.pickupLocationName?.trim() || null,
        location,
        photos: [],
        status: action === 'submit' ? 'Submitted' : 'PendingPickup',
        archived: false,
      },
      {
        onSuccess: async (pickup) => {
          for (const ph of photos ?? []) {
            try {
              await addPhotoMutation.mutateAsync({
                pickupId: pickup.id,
                photo: {
                  pickupId: pickup.id,
                  localUri: ph.localUri,
                  serverUrl: null,
                  exif: null,
                },
              })
            } catch {
              // Continue with other photos
            }
          }
          toast.success(action === 'submit' ? 'Pickup submitted' : 'Draft saved')
          if (action === 'submit') {
            navigate('/dashboard/pickups')
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to save')
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Sample Pickup</h1>
        <p className="mt-1 text-muted-foreground">
          Log each 100 mL vial pickup with site, readings, GPS, and photos
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const action =
            (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-action') === 'submit'
              ? 'submit'
              : 'draft'
          handleSubmit((data) => onSubmit(data, action))(e)
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Site & Sample
            </CardTitle>
            <CardDescription>
              Select site (required) and enter vial count. Sample ID is auto-generated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteId">Site *</Label>
              <select
                id="siteId"
                {...register('siteId')}
                disabled={sitesLoading}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                  errors.siteId && 'border-destructive'
                )}
              >
                <option value="">Select site...</option>
                {(sites ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.siteId && (
                <p className="text-sm text-destructive">{errors.siteId.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vialCount">Vial Count</Label>
                <Input
                  id="vialCount"
                  type="number"
                  min={1}
                  {...register('vialCount', { valueAsNumber: true })}
                  className={cn(errors.vialCount && 'border-destructive')}
                />
                {errors.vialCount && (
                  <p className="text-sm text-destructive">{errors.vialCount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Sample ID</Label>
                <Input value={sampleId} readOnly className="font-mono text-sm bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupLocationName">Pickup Location Name (optional)</Label>
              <Input
                id="pickupLocationName"
                {...register('pickupLocationName')}
                placeholder="e.g. Main entrance, Room 101"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vial ID</CardTitle>
            <CardDescription>Scan barcode or enter manually</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              {...register('vialId')}
              placeholder="Vial ID"
              className={cn(errors.vialId && 'border-destructive')}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setScanOpen(true)}
              aria-label="Scan barcode"
            >
              <ScanBarcode className="h-5 w-5" />
            </Button>
          </CardContent>
          {errors.vialId && (
            <p className="px-6 text-sm text-destructive">{errors.vialId.message}</p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Readings</CardTitle>
            <CardDescription>
              pH (0–14) and Chlorine (0–20 ppm). Required for submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ph">pH</Label>
              <Input
                id="ph"
                type="number"
                step="0.01"
                min="0"
                max="14"
                {...register('pH', { valueAsNumber: true })}
                className={cn(errors.pH && 'border-destructive')}
                placeholder="7.0"
              />
              {errors.pH && (
                <p className="text-sm text-destructive">{errors.pH.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="chlorineReading">Chlorine (ppm)</Label>
              <Input
                id="chlorineReading"
                type="number"
                step="0.01"
                min="0"
                max="20"
                {...register('chlorineReading', { valueAsNumber: true })}
                className={cn(errors.chlorineReading && 'border-destructive')}
                placeholder="1.5"
              />
              {errors.chlorineReading && (
                <p className="text-sm text-destructive">{errors.chlorineReading.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GPS Location</CardTitle>
            <CardDescription>
              Capture current location (optional if not available). Recommended for chain of custody.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={handleCaptureGps}
              disabled={isCapturingGps}
            >
              {isCapturingGps ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              {isCapturingGps ? 'Capturing...' : 'Capture GPS'}
            </Button>
            {gps && (
              <p className="mt-2 text-sm text-muted-foreground">
                {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{gps.accuracy.toFixed(0)}m)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>At least 1 photo recommended for submission</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button type="button" variant="outline" onClick={handlePhotoCapture}>
              <Camera className="h-4 w-4 mr-2" />
              Capture Photo
            </Button>
            {(photos ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(photos ?? []).map((ph) => (
                  <div key={ph.id} className="relative">
                    <img
                      src={ph.localUri}
                      alt="Sample"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white"
                      onClick={() => removePhoto(ph.id)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site Notes</CardTitle>
            <CardDescription>Customer or site notes (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              {...register('customerSiteNotes')}
              placeholder="Notes..."
            />
          </CardContent>
        </Card>

        {draftPickupId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </CardTitle>
              <CardDescription>
                Add photos, PDFs, CSV exports, or instrument raw files. Files are securely stored and scanned.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileAttachmentUploader
                relatedEntityType="pickup"
                relatedEntityId={draftPickupId}
                allowedTypes={[
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'image/gif',
                  'application/pdf',
                  'text/csv',
                  'application/vnd.ms-excel',
                  'text/plain',
                  'application/octet-stream',
                ]}
                maxSize={10 * 1024 * 1024}
              />
              <AttachmentListView
                relatedEntityType="pickup"
                relatedEntityId={draftPickupId}
                showDelete
                emptyMessage="No attachments yet. Drop files above to add."
              />
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/pickups')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="outline"
            data-action="draft"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Draft
          </Button>
          <Button
            type="submit"
            data-action="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Submit
          </Button>
        </div>
      </form>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
      />
    </div>
  )
}
