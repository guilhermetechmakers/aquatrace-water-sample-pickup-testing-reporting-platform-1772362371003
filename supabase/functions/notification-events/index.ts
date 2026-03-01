/**
 * Notification Events Edge Function
 * Enqueues notification events and creates notification records for recipients.
 * Event types: pickup_assigned, pickup_completed, lab_results_ready, approval_needed,
 * invoice_created, invoice_paid, sla_breach, verification, report_delivery
 * Recipients resolved from payload (recipient_user_id, technician_id, customer_id, etc.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EVENT_TYPES = [
  'pickup_assigned', 'pickup_completed', 'lab_results_ready',
  'approval_needed', 'invoice_created', 'invoice_paid', 'sla_breach',
  'verification', 'report_delivery',
] as const

function getRecipientIds(payload: Record<string, unknown>, eventType: string): string[] {
  const ids: string[] = []
  const recipient = payload.recipient_user_id ?? payload.recipientUserId
  if (recipient && typeof recipient === 'string') ids.push(recipient)
  const technician = payload.technician_id ?? payload.technicianId
  if (technician && typeof technician === 'string') ids.push(technician)
  const labManager = payload.lab_manager_id ?? payload.labManagerId
  if (labManager && typeof labManager === 'string') ids.push(labManager)
  const customer = payload.customer_user_id ?? payload.customerUserId
  if (customer && typeof customer === 'string') ids.push(customer)
  const assignedTo = payload.assigned_to ?? payload.assignedTo
  if (assignedTo && typeof assignedTo === 'string') ids.push(assignedTo)
  if (Array.isArray(payload.recipient_ids)) {
    for (const id of payload.recipient_ids) {
      if (typeof id === 'string') ids.push(id)
    }
  }
  return [...new Set(ids)]
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

    const body = await req.json().catch(() => ({})) as { event_type?: string; payload?: Record<string, unknown> }
    const eventType = body?.event_type ?? ''
    const payload = (body?.payload ?? {}) as Record<string, unknown>

    if (!EVENT_TYPES.includes(eventType as typeof EVENT_TYPES[number])) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_type', allowed: EVENT_TYPES }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: eventRow, error: eventErr } = await supabase
      .from('notification_events')
      .insert({
        type: eventType,
        payload: payload ?? {},
      })
      .select('id')
      .single()

    if (eventErr || !eventRow) {
      return new Response(
        JSON.stringify({ error: eventErr?.message ?? 'Failed to enqueue event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const recipientIds = getRecipientIds(payload, eventType)
    const notifications: Array<{ recipient_user_id: string; event_type: string; channel: string; payload: Record<string, unknown> }> = []

    for (const userId of recipientIds) {
      if (userId) {
        notifications.push({
          recipient_user_id: userId,
          event_type: eventType,
          channel: 'in_app',
          payload: payload ?? {},
        })
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(
        notifications.map((n) => ({
          ...n,
          status: 'queued',
          attempt_count: 0,
          max_attempts: 3,
        }))
      )
    }

    return new Response(
      JSON.stringify({ id: eventRow.id, received: true }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
