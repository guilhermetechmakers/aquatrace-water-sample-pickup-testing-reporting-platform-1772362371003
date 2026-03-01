import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AvatarAndHeader,
  ProfileForm,
  SecurityPanel,
  SessionsPanel,
  NotificationSettingsPanel,
} from '@/components/profile'
import { useProfile } from '@/hooks/useProfile'
import { User, Shield, Monitor, Bell } from 'lucide-react'

export function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile()

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account details, security settings, and preferences
        </p>
      </div>

      <AvatarAndHeader
        displayName={profile?.displayName}
        role={profile?.role}
        avatarUrl={profile?.avatarUrl}
        isLoading={isLoading}
      />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Unable to load profile. {error.message} Make sure you are signed in and the API is available.
          </p>
        </div>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6">
          <ProfileForm roleReadOnly />
        </TabsContent>
        <TabsContent value="security" className="mt-6">
          <SecurityPanel />
        </TabsContent>
        <TabsContent value="sessions" className="mt-6">
          <SessionsPanel />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
