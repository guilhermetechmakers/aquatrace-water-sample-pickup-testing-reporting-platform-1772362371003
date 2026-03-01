/**
 * Create Stripe Customer Edge Function
 * Creates a Stripe customer and links to local customer record.
 * Required: STRIPE_SECRET_KEY secret
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as { customerId?: string }
    const customerId = payload.customerId ?? ''
    if (!customerId) {
      return new Response(JSON.stringify({ error: 'customerId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: custRow, error: custErr } = await supabase
      .from('customers')
      .select('id, name, email, billing_address')
      .eq('id', customerId)
      .maybeSingle()

    if (custErr || !custRow) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const c = custRow as Record<string, unknown>
    const addr = (c.billing_address as Record<string, unknown>) ?? {}

    const Stripe = (await import('https://esm.sh/stripe@14.21.0')).default
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' })

    const stripeCustomer = await stripe.customers.create({
      email: (c.email as string) ?? undefined,
      name: (c.name as string) ?? undefined,
      address: {
        line1: (addr.line1 as string) ?? undefined,
        line2: (addr.line2 as string) ?? undefined,
        city: (addr.city as string) ?? undefined,
        state: (addr.state as string) ?? undefined,
        postal_code: (addr.postalCode as string) ?? undefined,
        country: (addr.country as string) ?? undefined,
      },
    })

    await supabase
      .from('customers')
      .update({
        stripe_customer_id: stripeCustomer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)

    return new Response(
      JSON.stringify({ stripeCustomerId: stripeCustomer.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
