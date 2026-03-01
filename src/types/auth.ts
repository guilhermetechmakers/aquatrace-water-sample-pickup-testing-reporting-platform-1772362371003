export type AuthRole =
  | 'TECHNICIAN'
  | 'LAB_TECH'
  | 'LAB_MANAGER'
  | 'ADMIN'
  | 'VIEWER'
  | 'CUSTOMER_VIEW'

export const AUTH_ROLES: AuthRole[] = [
  'TECHNICIAN',
  'LAB_TECH',
  'LAB_MANAGER',
  'ADMIN',
  'VIEWER',
  'CUSTOMER_VIEW',
]

export const ROLE_LABELS: Record<AuthRole, string> = {
  TECHNICIAN: 'Technician',
  LAB_TECH: 'Lab Technician',
  LAB_MANAGER: 'Lab Manager',
  ADMIN: 'Administrator',
  VIEWER: 'Viewer',
  CUSTOMER_VIEW: 'Customer',
}

export const SELF_SIGNUP_ROLES: AuthRole[] = ['TECHNICIAN', 'CUSTOMER_VIEW']

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: AuthRole
  emailVerified: boolean
  mfaEnabled: boolean
  avatarUrl: string | null
}

export interface AuthState {
  user: AuthUser | null
  session: { accessToken: string; refreshToken?: string } | null
  isLoading: boolean
  isInitialized: boolean
}
