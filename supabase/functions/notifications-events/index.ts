/**
 * Notifications Events Edge Function
 * Enqueues notification events for processing.
 * Events: pickup_assigned, pickup_completed, lab_results_ready, approval_needed,
 * invoice_created, invoice_paid, sla_breach, verification, report_delivery
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_EVENTS = [
  'pickup_assigned',
  'pickup_completed',
  'lab_results_ready',
  'approval_needed',
  'invoice_created',
  'invoice_paid',
  'sla_breach',
  'verification',
  'report_delivery',
] as const

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = (await req.json()) as { event_type?: string; payload?: Record<string, unknown> }
    const eventType = body?.event_type ?? ''
    const payload = body?.payload ?? {}

    if (!VALID_EVENTS.includes(eventType as (typeof VALID_EVENTS)[number])) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: row, error } = await supabase
      .from('notification_events')
      .insert({
        type: eventType,
        payload: payload,
      })
      .select('id')
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ accepted: true, eventId: row?.id }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
