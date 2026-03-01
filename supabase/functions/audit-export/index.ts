/**
 * Audit Export Edge Function
 * Exports audit logs as CSV or JSON. Admin only.
 * Query params: from, to, userId, actionTypes, resourceTypes, q, format (csv|json)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function escapeCsv(val: unknown): string {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}

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
    let q = ''
    let format = 'csv'
    const limit = 10000

    if (req.method === 'GET') {
      const url = new URL(req.url)
      from = url.searchParams.get('from') ?? ''
      to = url.searchParams.get('to') ?? ''
      userId = url.searchParams.get('userId') ?? ''
      const at = url.searchParams.get('actionTypes')
      actionTypes = at ? at.split(',').filter(Boolean) : []
      const rt = url.searchParams.get('resourceTypes')
      resourceTypes = rt ? rt.split(',').filter(Boolean) : []
      q = url.searchParams.get('q') ?? ''
      format = (url.searchParams.get('format') ?? 'csv') === 'json' ? 'json' : 'csv'
    } else {
      const body = (await req.json()) as Record<string, unknown>
      from = String(body?.from ?? '')
      to = String(body?.to ?? '')
      userId = String(body?.userId ?? '')
      actionTypes = Array.isArray(body?.actionTypes) ? (body.actionTypes as string[]) : []
      resourceTypes = Array.isArray(body?.resourceTypes) ? (body.resourceTypes as string[]) : []
      q = String(body?.q ?? '')
      format = (body?.format ?? 'csv') === 'json' ? 'json' : 'csv'
    }

    let query = supabaseAnon
      .from('audit_entries')
      .select('id, user_id, user_name, action_type, resource_type, resource_id, timestamp, metadata, hash')
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (from) query = query.gte('timestamp', from + 'T00:00:00Z')
    if (to) query = query.lte('timestamp', to + 'T23:59:59.999Z')
    if (userId) query = query.eq('user_id', userId)
    if (actionTypes.length > 0) query = query.in('action_type', actionTypes)
    if (resourceTypes.length > 0) query = query.in('resource_type', resourceTypes)
    if (q.trim()) {
      query = query.or(`user_name.ilike.%${q}%,resource_id.ilike.%${q}%,resource_type.ilike.%${q}%,action_type.ilike.%${q}%`)
    }

    const { data: rows, error } = await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const list = Array.isArray(rows) ? rows : []

    const filename = `audit-export-${new Date().toISOString().slice(0, 10)}`

    if (format === 'json') {
      return new Response(
        JSON.stringify({ data: list, format: 'json', filename: `${filename}.json` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const headers = ['id', 'user_id', 'user_name', 'action_type', 'resource_type', 'resource_id', 'timestamp', 'metadata_summary', 'hash']
    const csvRows = [headers.map(escapeCsv).join(',')]
    for (const row of list) {
      const r = row as Record<string, unknown>
      const meta = (r.metadata as Record<string, unknown>) ?? {}
      const metaSummary = Object.keys(meta).length > 0 ? JSON.stringify(meta).slice(0, 100) : ''
      csvRows.push([
        escapeCsv(r.id),
        escapeCsv(r.user_id),
        escapeCsv(r.user_name),
        escapeCsv(r.action_type),
        escapeCsv(r.resource_type),
        escapeCsv(r.resource_id),
        escapeCsv(r.timestamp),
        escapeCsv(metaSummary),
        escapeCsv(r.hash),
      ].join(','))
    }
    const csv = csvRows.join('\n')

    return new Response(
      JSON.stringify({ content: csv, format: 'csv', filename: `${filename}.csv` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
