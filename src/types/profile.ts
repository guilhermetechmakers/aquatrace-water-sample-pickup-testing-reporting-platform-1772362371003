export interface UserProfile {
  id: string
  displayName: string
  email: string
  phone: string | null
  role: string
  avatarUrl: string | null
  createdAt: string
  notificationSettings?: NotificationSettings
}

export interface UpdateProfileInput {
  displayName?: string
  email?: string
  phone?: string | null
}

export interface Session {
  id: string
  userId: string
  device: string
  location: string | null
  lastActive: string
  ip: string | null
  isCurrent: boolean
}

export interface SessionsResponse {
  sessions: Session[]
}

export interface TwoFAStatus {
  enabled: boolean
  methods: string[]
  backupCodesEnabled: boolean
}

export interface TwoFAUpdateInput {
  enable: boolean
  method?: string
}

export interface NotificationChannels {
  email: boolean
  inApp: boolean
  sms: boolean
}

export interface NotificationPreferences {
  accountAlerts?: boolean
  sampleUpdates?: boolean
  reportReady?: boolean
  [key: string]: boolean | undefined
}

export interface NotificationSettings {
  channels: NotificationChannels
  preferences: NotificationPreferences
}

export interface UpdateNotificationSettingsInput {
  channels?: Partial<NotificationChannels>
  preferences?: Partial<NotificationPreferences>
}
