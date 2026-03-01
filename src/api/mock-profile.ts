import type {
  UserProfile,
  UpdateProfileInput,
  SessionsResponse,
  TwoFAStatus,
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '@/types/profile'

let mockProfileState: UserProfile = {
  id: 'mock-user-1',
  displayName: 'John Doe',
  email: 'john@example.com',
  phone: '+1 (555) 123-4567',
  role: 'Lab Technician',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
}

let mockNotificationsState: NotificationSettings = {
  channels: {
    email: true,
    inApp: true,
    sms: false,
  },
  preferences: {
    accountAlerts: true,
    sampleUpdates: true,
    reportReady: true,
  },
}

const MOCK_SESSIONS: SessionsResponse = {
  sessions: [
    {
      id: 'session-1',
      userId: 'mock-user-1',
      device: 'Chrome on Windows',
      location: 'San Francisco, CA',
      lastActive: new Date().toISOString(),
      ip: '192.168.1.1',
      isCurrent: true,
    },
    {
      id: 'session-2',
      userId: 'mock-user-1',
      device: 'Safari on iPhone',
      location: 'San Francisco, CA',
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      ip: null,
      isCurrent: false,
    },
  ],
}

const MOCK_2FA: TwoFAStatus = {
  enabled: false,
  methods: [],
  backupCodesEnabled: false,
}

export const mockProfileApi = {
  getProfile: async (): Promise<UserProfile> => {
    await new Promise((r) => setTimeout(r, 300))
    return { ...mockProfileState }
  },
  updateProfile: async (updates: UpdateProfileInput): Promise<UserProfile> => {
    await new Promise((r) => setTimeout(r, 300))
    mockProfileState = { ...mockProfileState, ...updates }
    return { ...mockProfileState }
  },
  getSessions: async (): Promise<SessionsResponse> => {
    await new Promise((r) => setTimeout(r, 300))
    return { ...MOCK_SESSIONS }
  },
  get2FA: async (): Promise<TwoFAStatus> => {
    await new Promise((r) => setTimeout(r, 200))
    return { ...MOCK_2FA }
  },
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    await new Promise((r) => setTimeout(r, 200))
    return JSON.parse(JSON.stringify(mockNotificationsState))
  },
  updateNotificationSettings: async (
    updates: UpdateNotificationSettingsInput
  ): Promise<NotificationSettings> => {
    await new Promise((r) => setTimeout(r, 200))
    if (updates.channels) {
      mockNotificationsState = {
        ...mockNotificationsState,
        channels: { ...mockNotificationsState.channels, ...updates.channels },
      }
    }
    return JSON.parse(JSON.stringify(mockNotificationsState))
  },
}
