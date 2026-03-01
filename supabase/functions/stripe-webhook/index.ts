/**
 * Stripe Webhook Edge Function
 * Handles: payment_succeeded, payment_failed, invoice.payment_succeeded, invoice.payment_failed,
 * customer.subscription.updated, customer.subscription.deleted
 * Idempotent processing with signature verification.
 * Required secrets: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY (optional, for fetching details)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

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
    const stripeSignature = req.headers.get('stripe-signature') ?? ''
    const body = await req.text()

    if (!STRIPE_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Stripe signature (requires Stripe SDK)
    let event: { id: string; type: string; data: { object: Record<string, unknown> } }
    try {
      const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default
      event = Stripe.webhooks.constructEvent(body, stripeSignature, STRIPE_WEBHOOK_SECRET) as typeof event
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature', detail: String(err) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Idempotency: check if we've already processed this event
    const { data: existing } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `stripe_event_${event.id}`)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ received: true, id: event.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const obj = event.data?.object ?? {}

    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoiceId = obj.id as string
        const customerId = obj.customer as string
        const amountPaid = (obj.amount_paid as number) ?? 0
        const status = obj.status as string

        // Find local invoice by stripe_invoice_id
        const { data: invRow } = await supabase
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', invoiceId)
          .maybeSingle()

        if (invRow) {
          const localInvId = (invRow as { id: string }).id
          await supabase.from('payments').insert({
            invoice_id: localInvId,
            amount: amountPaid / 100,
            method: 'card',
            status: 'completed',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: (obj.payment_intent as string) ?? null,
          })
          await supabase
            .from('invoices')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', localInvId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoiceId = obj.id as string
        const { data: invRow } = await supabase
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', invoiceId)
          .maybeSingle()

        if (invRow) {
          await supabase
            .from('invoices')
            .update({ status: 'overdue', updated_at: new Date().toISOString() })
            .eq('id', (invRow as { id: string }).id)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subId = obj.id as string
        const status = obj.status as string
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        if (subRow) {
          const localStatus = status === 'active' ? 'active' : status === 'canceled' ? 'canceled' : status === 'past_due' ? 'past_due' : status === 'trialing' ? 'trialing' : 'incomplete'
          await supabase
            .from('subscriptions')
            .update({
              status: localStatus,
              current_period_start: (obj.current_period_start as number) ? new Date((obj.current_period_start as number) * 1000).toISOString() : undefined,
              current_period_end: (obj.current_period_end as number) ? new Date((obj.current_period_end as number) * 1000).toISOString() : undefined,
              cancel_at: (obj.cancel_at as number) ? new Date((obj.cancel_at as number) * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', (subRow as { id: string }).id)
        }
        break
      }

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        // Handled via invoice events; can optionally sync payment_intent to payments
        break

      default:
        // Ignore unhandled events
        break
    }

    // Mark event as processed (idempotency)
    const now = new Date().toISOString()
    await supabase.from('settings').upsert(
      {
        key: `stripe_event_${event.id}`,
        value: { processed_at: now, type: event.type },
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'key' }
    )

    return new Response(
      JSON.stringify({ received: true, id: event.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
