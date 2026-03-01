import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, MapPin, ScanBarcode, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { useCreatePickupSample, useAddPickupPhoto } from '@/hooks/usePickupSamples'
import { generateId } from '@/lib/offline-storage'
import { BarcodeScanner } from '@/components/technician/barcode-scanner'
import { cn } from '@/lib/utils'

const schema = z.object({
  vialId: z.string().min(1, 'Vial ID is required'),
  pH: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'pH must be 0–14')
    .max(14, 'pH must be 0–14')
    .nullable()
    .optional(),
  chlorine: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Chlorine must be ≥ 0')
    .nullable()
    .optional(),
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

  const createMutation = useCreatePickupSample()
  const addPhotoMutation = useAddPickupPhoto()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vialId: '',
      pH: undefined,
      chlorine: undefined,
      customerSiteNotes: '',
    },
  })

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

    if (!gps) {
      toast.error('Please capture GPS location')
      return
    }

    const pHNum =
      data.pH != null && data.pH !== undefined
        ? Number(data.pH)
        : null
    const chlorineNum =
      data.chlorine != null && data.chlorine !== undefined
        ? Number(data.chlorine)
        : null

    if (pHNum == null || chlorineNum == null) {
      toast.error('Please enter pH and Chlorine readings')
      return
    }

    const now = new Date().toISOString()
    createMutation.mutate(
      {
        vialId: data.vialId.trim(),
        pH: pHNum,
        chlorine: chlorineNum,
        volume: 100,
        timestamp: now,
        gpsLat: gps.lat,
        gpsLon: gps.lng,
        gpsAccuracy: gps.accuracy,
        customerSiteNotes: data.customerSiteNotes?.trim() || null,
        location: `Sample ${data.vialId}`,
        photos: [],
        status: action === 'submit' ? 'Submitted' : 'Pending',
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
          navigate('/dashboard/pickups')
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
          Capture vial ID, readings, GPS, and photos
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
            <CardTitle>Vial ID</CardTitle>
            <CardDescription>
              Scan barcode or enter manually
            </CardDescription>
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
              pH (0–14) and Chlorine (mg/L)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ph">pH</Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
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
              <Label htmlFor="chlorine">Chlorine (mg/L)</Label>
              <Input
                id="chlorine"
                type="number"
                step="0.1"
                min="0"
                {...register('chlorine', { valueAsNumber: true })}
                className={cn(errors.chlorine && 'border-destructive')}
                placeholder="1.5"
              />
              {errors.chlorine && (
                <p className="text-sm text-destructive">{errors.chlorine.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GPS Location</CardTitle>
            <CardDescription>
              Capture current location for sample site
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
            <CardDescription>
              At least 1 photo recommended
            </CardDescription>
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
            <CardDescription>
              Customer or site notes (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              {...register('customerSiteNotes')}
              placeholder="Notes..."
            />
          </CardContent>
        </Card>

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
