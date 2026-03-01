/**
 * Notifications Audit Edge Function
 * Fetch notification logs and metrics for admin dashboard.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
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
    if ((profile as { role?: string } | null)?.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = (await req.json().catch(() => ({}))) as {
      dateFrom?: string
      dateTo?: string
      event_type?: string
      status?: string
    }

    let q = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (body?.dateFrom) q = q.gte('created_at', body.dateFrom)
    if (body?.dateTo) q = q.lte('created_at', body.dateTo)
    if (body?.event_type) q = q.eq('event_type', body.event_type)
    if (body?.status) q = q.eq('status', body.status)

    const { data: notifications, error } = await q
    if (error) throw error

    const list = notifications ?? []

    const { count: deliveredCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
    const { count: failedCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
    const { count: queuedCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued')
    const { count: deadLetterCount } = await supabase
      .from('notification_dead_letters')
      .select('*', { count: 'exact', head: true })

    const { data: allForMetrics } = await supabase
      .from('notifications')
      .select('event_type, channel, status')

    const all = allForMetrics ?? []
    const byEventType: Record<string, number> = {}
    const byChannel: Record<string, number> = {}
    for (const n of all) {
      const row = n as { event_type?: string; channel?: string }
      const et = row.event_type ?? 'unknown'
      const ch = row.channel ?? 'unknown'
      byEventType[et] = (byEventType[et] ?? 0) + 1
      byChannel[ch] = (byChannel[ch] ?? 0) + 1
    }

    const metrics = {
      totalSent: deliveredCount ?? 0,
      totalFailed: failedCount ?? 0,
      totalQueued: queuedCount ?? 0,
      deadLetterCount: deadLetterCount ?? 0,
      byEventType,
      byChannel,
    }

    return new Response(
      JSON.stringify({ notifications: list, metrics }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
