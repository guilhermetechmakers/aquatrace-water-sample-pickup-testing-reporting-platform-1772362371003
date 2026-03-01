import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const phoneRegex = /^[+]?[\d\s\-()]{10,20}$/

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().refine((val) => !val || phoneRegex.test(val), 'Invalid phone format'),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  roleReadOnly?: boolean
  className?: string
}

export function ProfileForm({ roleReadOnly = true, className }: ProfileFormProps) {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    },
    values: {
      displayName: profile?.displayName ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(
      {
        displayName: data.displayName,
        email: data.email,
        phone: data.phone || null,
      },
      {
        onSuccess: () => reset(data),
      }
    )
  }

  const onCancel = () => reset()

  if (isLoading) {
    return (
      <Card className={cn('animate-fade-in', className)}>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('animate-fade-in', className)}>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account details. Changes will be reflected across the app.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              placeholder="Your name"
              className={cn(errors.displayName && 'border-destructive')}
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            />
            {errors.displayName && (
              <p id="displayName-error" className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className={cn(errors.email && 'border-destructive')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="+1 (555) 000-0000"
              className={cn(errors.phone && 'border-destructive')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-sm text-destructive">
                {errors.phone.message}
              </p>
            )}
          </div>
          {roleReadOnly && profile?.role && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={profile.role} disabled className="bg-muted" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
            {updateProfile.isPending ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={!isDirty}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
