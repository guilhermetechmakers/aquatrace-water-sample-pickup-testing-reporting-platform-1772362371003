/**
 * Notification Publish Edge Function
 * Manually trigger a test notification dispatch.
 * Used for testing templates and delivery flow.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await supabaseAuth.auth.getUser()
    const body = await req.json().catch(() => ({})) as { event_type?: string; recipient_user_id?: string }
    const eventType = body?.event_type ?? 'pickup_assigned'
    const recipientUserId = body?.recipient_user_id ?? user?.id ?? ''

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: 'recipient_user_id required for test (or must be authenticated)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: eventRow, error: eventErr } = await supabase
      .from('notification_events')
      .insert({
        type: eventType,
        payload: { recipient_user_id: recipientUserId, test: true },
      })
      .select('id')
      .single()

    if (eventErr || !eventRow) {
      return new Response(
        JSON.stringify({ error: eventErr?.message ?? 'Failed to create event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await supabase.from('notifications').insert({
      recipient_user_id: recipientUserId,
      event_type: eventType,
      channel: 'in_app',
      status: 'queued',
      payload: { recipient_user_id: recipientUserId, test: true },
      attempt_count: 0,
      max_attempts: 3,
    })

    return new Response(
      JSON.stringify({ ok: true, eventId: eventRow.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
