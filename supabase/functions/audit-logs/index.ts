/**
 * Audit Logs Edge Function
 * Fetches audit entries with filters. Admin only.
 * GET query params: from, to, userId, actionTypes[], resourceTypes[], resourceIds[], q, page, pageSize
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'GET') {
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
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

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

    const url = new URL(req.url)
    const from = url.searchParams.get('from') ?? ''
    const to = url.searchParams.get('to') ?? ''
    const userId = url.searchParams.get('userId') ?? ''
    const q = url.searchParams.get('q') ?? ''
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))

    const actionTypesParam = url.searchParams.get('actionTypes')
    const actionTypes = actionTypesParam ? actionTypesParam.split(',').filter(Boolean) : []
    const resourceTypesParam = url.searchParams.get('resourceTypes')
    const resourceTypes = resourceTypesParam ? resourceTypesParam.split(',').filter(Boolean) : []
    const resourceIdsParam = url.searchParams.get('resourceIds')
    const resourceIds = resourceIdsParam ? resourceIdsParam.split(',').filter(Boolean) : []

    let query = supabaseService
      .from('audit_entries')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (from) query = query.gte('timestamp', from + 'T00:00:00Z')
    if (to) query = query.lte('timestamp', to + 'T23:59:59.999Z')
    if (userId) query = query.eq('user_id', userId)
    if (actionTypes.length > 0) query = query.in('action_type', actionTypes)
    if (resourceTypes.length > 0) query = query.in('resource_type', resourceTypes)
    if (resourceIds.length > 0) query = query.in('resource_id', resourceIds)
    if (q.trim()) {
      const term = `%${q.trim()}%`
      query = query.or(`user_name.ilike.${term},resource_id.ilike.${term},resource_type.ilike.${term}`)
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
        data: list.map((r: Record<string, unknown>) => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          actionType: r.action_type,
          resourceType: r.resource_type,
          resourceId: r.resource_id,
          timestamp: r.timestamp,
          metadata: r.metadata ?? {},
          hash: r.hash,
          previousHash: r.previous_hash,
          signature: r.signature,
        })),
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
