# Auth Token Storage Strategy

## Current Implementation

- **Access token**: Stored in `localStorage` under key `auth_token`
- **Refresh token**: Managed by Supabase Auth SDK (stored in memory/localStorage by the SDK)
- **Token sync**: `AuthContext` sets `auth_token` in localStorage when the user signs in; `api.ts` reads it for API requests

## Recommended Production Strategy

1. **Prefer httpOnly cookies** for refresh tokens when a backend can set them:
   - Use Supabase Edge Functions or a custom auth backend to set `Set-Cookie` with `httpOnly`, `Secure`, `SameSite=Strict`
   - Access token can remain in memory only (not localStorage) for SPA; refresh via cookie

2. **When using Supabase Auth only** (current setup):
   - Supabase SDK manages session storage
   - Access token in localStorage enables API layer to attach `Authorization: Bearer` header
   - Consider short-lived access tokens (Supabase default ~1h) and refresh flow

3. **Security measures**:
   - Never expose refresh tokens in client-side code
   - Use `Secure` and `SameSite` flags when cookies are available
   - Implement token rotation on refresh
   - Clear tokens on sign out

## Environment Variables

See `.env.example` for required and optional auth-related variables.
