/**
 * Audit Query Edge Function
 * Fetches audit logs with filters. Admin only.
 * Query params: from, to, userId, actionTypes, resourceTypes, resourceIds, q, page, pageSize
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST' && req.method !== 'GET') {
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
    let userId = ''
    let actionTypes: string[] = []
    let resourceTypes: string[] = []
    let resourceIds: string[] = []
    let q = ''
    let page = 1
    let pageSize = 20

    if (req.method === 'GET') {
      const url = new URL(req.url)
      from = url.searchParams.get('from') ?? ''
      to = url.searchParams.get('to') ?? ''
      userId = url.searchParams.get('userId') ?? ''
      const at = url.searchParams.get('actionTypes')
      actionTypes = at ? at.split(',').filter(Boolean) : []
      const rt = url.searchParams.get('resourceTypes')
      resourceTypes = rt ? rt.split(',').filter(Boolean) : []
      const rid = url.searchParams.get('resourceIds')
      resourceIds = rid ? rid.split(',').filter(Boolean) : []
      q = url.searchParams.get('q') ?? ''
      page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
      pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
    } else {
      const body = (await req.json()) as Record<string, unknown>
      from = String(body?.from ?? '')
      to = String(body?.to ?? '')
      userId = String(body?.userId ?? '')
      actionTypes = Array.isArray(body?.actionTypes) ? (body.actionTypes as string[]) : []
      resourceTypes = Array.isArray(body?.resourceTypes) ? (body.resourceTypes as string[]) : []
      resourceIds = Array.isArray(body?.resourceIds) ? (body.resourceIds as string[]) : []
      q = String(body?.q ?? '')
      page = Math.max(1, parseInt(String(body?.page ?? 1), 10))
      pageSize = Math.min(100, Math.max(10, parseInt(String(body?.pageSize ?? 20), 10)))
    }

    let query = supabaseAnon
      .from('audit_entries')
      .select('id, user_id, user_name, action_type, resource_type, resource_id, timestamp, metadata, hash, previous_hash, signature', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (from) query = query.gte('timestamp', from + 'T00:00:00Z')
    if (to) query = query.lte('timestamp', to + 'T23:59:59.999Z')
    if (userId) query = query.eq('user_id', userId)
    if (actionTypes.length > 0) query = query.in('action_type', actionTypes)
    if (resourceTypes.length > 0) query = query.in('resource_type', resourceTypes)
    if (resourceIds.length > 0) query = query.in('resource_id', resourceIds)
    if (q.trim()) {
      query = query.or(`user_name.ilike.%${q}%,resource_id.ilike.%${q}%,resource_type.ilike.%${q}%,action_type.ilike.%${q}%`)
    }

    const { data: rows, error, count } = await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const list = Array.isArray(rows) ? rows : []

    return new Response(
      JSON.stringify({
        data: list,
        total: count ?? list.length,
        page,
        pageSize,
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
