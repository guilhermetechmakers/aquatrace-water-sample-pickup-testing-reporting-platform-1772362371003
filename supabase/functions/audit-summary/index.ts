/**
 * Audit Summary Edge Function
 * Returns counts by action type, date ranges. Admin only.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAnon
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? ''
    if (role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let from = ''
    let to = ''
    if (req.method === 'GET') {
      const url = new URL(req.url)
      from = url.searchParams.get('from') ?? ''
      to = url.searchParams.get('to') ?? ''
    } else {
      const body = (await req.json()) as Record<string, unknown>
      from = String(body?.from ?? '')
      to = String(body?.to ?? '')
    }

    let query = supabaseAnon
      .from('audit_entries')
      .select('action_type, resource_type, resource_id')

    if (from) query = query.gte('timestamp', from + 'T00:00:00Z')
    if (to) query = query.lte('timestamp', to + 'T23:59:59.999Z')

    const { data: rows, error } = await query.limit(50000)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const list = Array.isArray(rows) ? rows : []
    const byActionType: Record<string, number> = {}
    const byResourceType: Record<string, number> = {}
    const topResources: Record<string, number> = {}

    for (const row of list) {
      const r = row as { action_type?: string; resource_type?: string; resource_id?: string }
      const at = r.action_type ?? 'UNKNOWN'
      const rt = r.resource_type ?? 'UNKNOWN'
      const rid = r.resource_id ?? ''
      byActionType[at] = (byActionType[at] ?? 0) + 1
      byResourceType[rt] = (byResourceType[rt] ?? 0) + 1
      if (rid) {
        const key = `${rt}:${rid}`
        topResources[key] = (topResources[key] ?? 0) + 1
      }
    }

    const topResourcesList = Object.entries(topResources)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ resource: key, count }))

    return new Response(
      JSON.stringify({
        total: list.length,
        byActionType,
        byResourceType,
        topResources: topResourcesList,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
