import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthRole, AuthUser } from '@/types/auth'

const AUTH_TOKEN_KEY = 'auth_token'
const REMEMBER_ME_KEY = 'auth_remember_me'

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url && key)
}

async function trackSession(userId: string) {
  if (!isSupabaseConfigured()) return
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    const deviceName = ua.length > 100 ? ua.slice(0, 100) : ua
    await supabase.from('user_sessions').insert({
      user_id: userId,
      device_name: deviceName || 'Unknown',
      user_agent: ua,
    } as { user_id: string; device_name: string; user_agent: string })
  } catch {
    // Ignore - session tracking is best-effort
  }
}

function mapRoleFromDb(role: string | null | undefined): AuthRole {
  const r = (role ?? '').toUpperCase()
  if (['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN', 'CUSTOMER_VIEW'].includes(r)) {
    return r as AuthRole
  }
  return 'TECHNICIAN'
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  isInitialized: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: AuthRole, company?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  setTokenForApi: (token: string | null) => void
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  hasRole: (roles: AuthRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const setTokenForApi = useCallback((token: string | null) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
    setAccessToken(token)
  }, [])

  const fetchProfile = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    if (!isSupabaseConfigured()) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, role, avatar_url, email_verified, mfa_enabled')
        .eq('id', userId)
        .single()

      if (error || !data) {
        return {
          id: userId,
          email,
          displayName: email.split('@')[0] ?? 'User',
          role: mapRoleFromDb(null),
          emailVerified: false,
          mfaEnabled: false,
          avatarUrl: null,
        }
      }

      return {
        id: userId,
        email,
        displayName: (data.display_name as string) ?? email.split('@')[0] ?? 'User',
        role: mapRoleFromDb(data.role),
        emailVerified: Boolean(data.email_verified),
        mfaEnabled: Boolean(data.mfa_enabled),
        avatarUrl: (data.avatar_url as string) ?? null,
      }
    } catch {
      return {
        id: userId,
        email,
        displayName: email.split('@')[0] ?? 'User',
        role: 'TECHNICIAN' as AuthRole,
        emailVerified: false,
        mfaEnabled: false,
        avatarUrl: null,
      }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null
      if (stored) {
        setAccessToken(stored)
        setUser({
          id: 'demo-user',
          email: 'demo@aquatrace.local',
          displayName: 'Demo User',
          role: 'LAB_TECH' as AuthRole,
          emailVerified: true,
          mfaEnabled: false,
          avatarUrl: null,
        })
      } else {
        setUser(null)
        setAccessToken(null)
      }
      setIsLoading(false)
      setIsInitialized(true)
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        setUser(null)
        setTokenForApi(null)
        setIsLoading(false)
        setIsInitialized(true)
        return
      }

      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email ?? '')
        setUser(profile)
        setTokenForApi(session.access_token)
      } else {
        setUser(null)
        setTokenForApi(null)
      }
    } catch {
      setUser(null)
      setTokenForApi(null)
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }, [fetchProfile, setTokenForApi])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id, session.user.email ?? '')
            setUser(profile)
            setTokenForApi(session.access_token)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setTokenForApi(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, setTokenForApi])

  const signIn = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      if (!isSupabaseConfigured()) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_TOKEN_KEY, 'demo-token')
          localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0')
        }
        setAccessToken('demo-token')
        setUser({
          id: 'demo-user',
          email,
          displayName: email.split('@')[0] ?? 'User',
          role: 'LAB_TECH' as AuthRole,
          emailVerified: true,
          mfaEnabled: false,
          avatarUrl: null,
        })
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.session?.user) {
        const profile = await fetchProfile(data.session.user.id, data.session.user.email ?? '')
        setUser(profile)
        setTokenForApi(data.session.access_token)
        await trackSession(data.session.user.id)
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? '1' : '0')
      }
    },
    [fetchProfile, setTokenForApi]
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      role: AuthRole,
      _company?: string
    ) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Sign up requires Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role,
            company: _company ?? null,
          },
        },
      })

      if (error) throw error

      if (data.user && data.session) {
        const profile = await fetchProfile(data.user.id, data.user.email ?? '')
        setUser(profile)
        setTokenForApi(data.session.access_token)
      }
    },
    [fetchProfile, setTokenForApi]
  )

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Password reset requires Supabase configuration.') }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    })
    return { error: error ?? null }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Password update requires Supabase configuration.') }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error ?? null }
  }, [])

  const hasRole = useCallback(
    (roles: AuthRole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setTokenForApi(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  }, [setTokenForApi])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isInitialized,
      signIn,
      signUp,
      signOut,
      refreshSession,
      setTokenForApi,
      resetPassword,
      updatePassword,
      hasRole,
    }),
    [
      user,
      accessToken,
      isLoading,
      isInitialized,
      signIn,
      signUp,
      signOut,
      refreshSession,
      setTokenForApi,
      resetPassword,
      updatePassword,
      hasRole,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
