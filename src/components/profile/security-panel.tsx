import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useChangePassword, use2FA, useUpdate2FA, useRequestPasswordReset } from '@/hooks/useProfile'
import { useProfile } from '@/hooks/useProfile'
import { KeyRound, Shield, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent']
  return { score, label: labels[score] ?? '' }
}

export function SecurityPanel() {
  const [showPasswords, setShowPasswords] = useState(false)
  const { data: profile } = useProfile()
  const { data: twoFA, isLoading: twoFALoading } = use2FA()
  const update2FA = useUpdate2FA()
  const changePassword = useChangePassword()
  const requestReset = useRequestPasswordReset()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const newPassword = watch('newPassword')
  const strength = getPasswordStrength(newPassword ?? '')

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePassword.mutate(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() }
    )
  }

  const handle2FAToggle = (checked: boolean) => {
    update2FA.mutate({ enable: checked })
  }

  const handlePasswordReset = () => {
    const email = profile?.email
    if (email) {
      requestReset.mutate(email)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password. Use a strong password with a mix of letters, numbers, and symbols.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type={showPasswords ? 'text' : 'password'}
                {...register('currentPassword')}
                className={cn(errors.currentPassword && 'border-destructive')}
                aria-invalid={!!errors.currentPassword}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                {...register('newPassword')}
                className={cn(errors.newPassword && 'border-destructive')}
                aria-invalid={!!errors.newPassword}
              />
              {newPassword && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        strength.score <= 2 && 'bg-destructive w-1/3',
                        strength.score === 3 && 'bg-warning w-1/2',
                        strength.score >= 4 && 'bg-success w-full'
                      )}
                      style={{ width: `${(strength.score / 6) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
              )}
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={cn(errors.confirmPassword && 'border-destructive')}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPasswords"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="showPasswords" className="font-normal text-sm cursor-pointer">
                Show passwords
              </Label>
            </div>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Updating...' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security by enabling 2FA. You&apos;ll need a second factor to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="font-medium">2FA Status</p>
            <p className="text-sm text-muted-foreground">
              {twoFALoading ? 'Loading...' : twoFA?.enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <Switch
            checked={twoFA?.enabled ?? false}
            onCheckedChange={handle2FAToggle}
            disabled={twoFALoading || update2FA.isPending}
            aria-label="Enable or disable two-factor authentication"
          />
        </CardContent>
      </Card>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Password Reset
          </CardTitle>
          <CardDescription>
            Forgot your password? We can send a reset link to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {profile?.email ? `Reset link will be sent to ${profile.email}` : 'Add your email in profile first.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/forgot-password">Go to reset page</Link>
            </Button>
            {profile?.email && (
              <Button
                variant="outline"
                onClick={handlePasswordReset}
                disabled={requestReset.isPending}
              >
                {requestReset.isPending ? 'Sending...' : 'Send reset email'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
