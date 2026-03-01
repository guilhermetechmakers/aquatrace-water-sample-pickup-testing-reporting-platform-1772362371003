export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          phone: string | null
          role: string
          avatar_url: string | null
          email_verified: boolean
          mfa_enabled: boolean
          sso_provider: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          phone?: string | null
          role?: string
          avatar_url?: string | null
          email_verified?: boolean
          mfa_enabled?: boolean
          sso_provider?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          phone?: string | null
          role?: string
          avatar_url?: string | null
          email_verified?: boolean
          mfa_enabled?: boolean
          sso_provider?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          device_name: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
          last_active_at: string
          revoked: boolean
        }
        Insert: {
          id?: string
          user_id: string
          device_name: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          last_active_at?: string
          revoked?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          device_name?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          last_active_at?: string
          revoked?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
