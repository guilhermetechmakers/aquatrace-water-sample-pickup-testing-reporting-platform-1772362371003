/**
 * Import Template Edge Function
 * Returns CSV template definition for samples, results, invoices, or customers.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATES: Record<string, { fields: { name: string; required: boolean; type: string; example: string }[] }> = {
  samples: {
    fields: [
      { name: 'sample_id', required: true, type: 'string', example: 'SMP-2025-001' },
      { name: 'customer_id', required: false, type: 'uuid', example: '' },
      { name: 'site_id', required: false, type: 'uuid', example: '' },
      { name: 'collection_date', required: true, type: 'date', example: '2025-03-01' },
      { name: 'location', required: false, type: 'string', example: 'Main Building' },
      { name: 'status', required: false, type: 'string', example: 'completed' },
    ],
  },
  results: {
    fields: [
      { name: 'sample_id', required: true, type: 'string', example: 'SMP-2025-001' },
      { name: 'spc_value', required: false, type: 'number', example: '150' },
      { name: 'spc_unit', required: false, type: 'string', example: 'CFU/mL' },
      { name: 'total_coliform_value', required: false, type: 'number', example: '0' },
      { name: 'total_coliform_unit', required: false, type: 'string', example: 'CFU/100mL' },
      { name: 'method', required: false, type: 'string', example: 'Standard' },
      { name: 'test_date', required: true, type: 'date', example: '2025-03-01' },
      { name: 'status', required: false, type: 'string', example: 'approved' },
    ],
  },
  invoices: {
    fields: [
      { name: 'invoice_number', required: true, type: 'string', example: 'INV-2025-0001' },
      { name: 'customer_id', required: true, type: 'uuid', example: '' },
      { name: 'due_date', required: true, type: 'date', example: '2025-04-01' },
      { name: 'amount', required: true, type: 'number', example: '500.00' },
      { name: 'currency', required: false, type: 'string', example: 'USD' },
      { name: 'status', required: false, type: 'string', example: 'draft' },
    ],
  },
  customers: {
    fields: [
      { name: 'name', required: true, type: 'string', example: 'Acme Water Co' },
      { name: 'email', required: true, type: 'email', example: 'billing@acme.com' },
      { name: 'billing_contact', required: false, type: 'string', example: 'John Doe' },
      { name: 'currency', required: false, type: 'string', example: 'USD' },
      { name: 'address_line1', required: false, type: 'string', example: '123 Main St' },
      { name: 'city', required: false, type: 'string', example: 'Boston' },
      { name: 'state', required: false, type: 'string', example: 'MA' },
      { name: 'postal_code', required: false, type: 'string', example: '02101' },
      { name: 'country', required: false, type: 'string', example: 'US' },
    ],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
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

    const body = (await req.json()) as { type?: string }
    const type = (body.type ?? 'samples') as string

    const template = TEMPLATES[type] ?? TEMPLATES.samples
    const headerRow = template.fields.map((f) => f.name).join(',')
    const exampleRow = template.fields.map((f) => f.example).join(',')

    return new Response(
      JSON.stringify({
        type,
        templateUrl: `data:text/csv;base64,${btoa(headerRow + '\n' + exampleRow)}`,
        fields: template.fields,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to fetch template' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
