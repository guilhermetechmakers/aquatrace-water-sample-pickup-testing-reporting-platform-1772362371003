/**
 * Search Autocomplete Edge Function
 * Returns top suggestions for samples, reports, customers, invoices.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_SUGGESTIONS = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabaseAnon.from('profiles').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role ?? ''

    const body = (await req.json().catch(() => ({}))) as { query?: string; type?: string }
    const query = (body?.query ?? '').trim().toLowerCase()
    const type = (body?.type ?? 'samples') as string

    const suggestions: Array<{ id: string; label: string; type: string; meta?: string }> = []
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ((type === 'samples' || !type) && ['TECHNICIAN', 'LAB_TECH', 'LAB_MANAGER', 'ADMIN'].includes(role)) {
      let q = supabase
        .from('pickups')
        .select('id, vial_id, sample_id, location')
        .or(`vial_id.ilike.%${query}%,sample_id.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(MAX_SUGGESTIONS)

      if (role === 'TECHNICIAN') {
        q = q.eq('technician_id', user.id)
      }

      const { data: rows } = await q
      const list = Array.isArray(rows) ? rows : []
      for (const r of list) {
        const row = r as { id: string; vial_id?: string; sample_id?: string; location?: string }
        const label = row.sample_id ?? row.vial_id ?? row.location ?? row.id
        if (label) {
          suggestions.push({
            id: row.id,
            label: String(label),
            type: 'sample',
            meta: row.location ?? undefined,
          })
        }
      }
    }

    if ((type === 'reports' || !type) && ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'].includes(role) && suggestions.length < MAX_SUGGESTIONS) {
      const { data: rows } = await supabase
        .from('reports')
        .select('id, report_id')
        .ilike('report_id', `%${query}%`)
        .limit(MAX_SUGGESTIONS - suggestions.length)

      const list = Array.isArray(rows) ? rows : []
      for (const r of list) {
        const row = r as { id: string; report_id?: string }
        suggestions.push({
          id: row.id,
          label: row.report_id ?? row.id,
          type: 'report',
        })
      }
    }

    if ((type === 'customers' || !type) && ['LAB_MANAGER', 'ADMIN'].includes(role) && suggestions.length < MAX_SUGGESTIONS) {
      const { data: rows } = await supabase
        .from('customers')
        .select('id, name, email')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(MAX_SUGGESTIONS - suggestions.length)

      const list = Array.isArray(rows) ? rows : []
      for (const r of list) {
        const row = r as { id: string; name?: string; email?: string }
        suggestions.push({
          id: row.id,
          label: row.name ?? row.email ?? row.id,
          type: 'customer',
          meta: row.email ?? undefined,
        })
      }
    }

    if ((type === 'invoices' || !type) && ['LAB_MANAGER', 'ADMIN'].includes(role) && suggestions.length < MAX_SUGGESTIONS) {
      const { data: rows } = await supabase
        .from('invoices')
        .select('id, invoice_id')
        .ilike('invoice_id', `%${query}%`)
        .limit(MAX_SUGGESTIONS - suggestions.length)

      const list = Array.isArray(rows) ? rows : []
      for (const r of list) {
        const row = r as { id: string; invoice_id?: string }
        suggestions.push({
          id: row.id,
          label: row.invoice_id ?? row.id,
          type: 'invoice',
        })
      }
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, MAX_SUGGESTIONS) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
