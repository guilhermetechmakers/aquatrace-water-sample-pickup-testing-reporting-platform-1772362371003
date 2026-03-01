/**
 * Data Import Template Edge Function
 * Returns CSV template definition for samples, results, invoices, or customers.
 */

import { corsHeaders } from '../_shared/cors.ts'

const TEMPLATES: Record<string, { fields: { name: string; required: boolean; type: string; example: string }[]; headerRow: string }> = {
  samples: {
    fields: [
      { name: 'sample_id', required: true, type: 'string', example: 'SMP-2025-0001' },
      { name: 'location', required: true, type: 'string', example: 'Site A - Main' },
      { name: 'site_id', required: false, type: 'uuid', example: '' },
      { name: 'customer_id', required: false, type: 'uuid', example: '' },
      { name: 'chlorine_reading', required: false, type: 'number', example: '0.5' },
      { name: 'vial_count', required: false, type: 'number', example: '1' },
      { name: 'status', required: false, type: 'string', example: 'completed' },
      { name: 'collection_date', required: false, type: 'date', example: '2025-03-01' },
    ],
    headerRow: 'sample_id,location,site_id,customer_id,chlorine_reading,vial_count,status,collection_date',
  },
  results: {
    fields: [
      { name: 'sample_id', required: true, type: 'string', example: 'SMP-2025-0001' },
      { name: 'spc', required: false, type: 'number', example: '150' },
      { name: 'total_coliform', required: false, type: 'number', example: '0' },
      { name: 'spc_unit', required: false, type: 'string', example: 'CFU/mL' },
      { name: 'total_coliform_unit', required: false, type: 'string', example: 'CFU/100mL' },
      { name: 'method', required: false, type: 'string', example: 'Standard' },
      { name: 'status', required: false, type: 'string', example: 'approved' },
      { name: 'test_date', required: false, type: 'date', example: '2025-03-01' },
    ],
    headerRow: 'sample_id,spc,total_coliform,spc_unit,total_coliform_unit,method,status,test_date',
  },
  invoices: {
    fields: [
      { name: 'invoice_number', required: true, type: 'string', example: 'INV-2025-0001' },
      { name: 'customer_id', required: true, type: 'uuid', example: '' },
      { name: 'amount', required: true, type: 'number', example: '150.00' },
      { name: 'currency', required: false, type: 'string', example: 'USD' },
      { name: 'due_date', required: true, type: 'date', example: '2025-04-01' },
      { name: 'issue_date', required: false, type: 'date', example: '2025-03-01' },
      { name: 'status', required: false, type: 'string', example: 'draft' },
    ],
    headerRow: 'invoice_number,customer_id,amount,currency,due_date,issue_date,status',
  },
  customers: {
    fields: [
      { name: 'name', required: true, type: 'string', example: 'Acme Water Co' },
      { name: 'email', required: true, type: 'string', example: 'billing@acme.com' },
      { name: 'billing_contact', required: false, type: 'string', example: 'John Doe' },
      { name: 'tax_id', required: false, type: 'string', example: '12-3456789' },
      { name: 'currency', required: false, type: 'string', example: 'USD' },
      { name: 'address_line1', required: false, type: 'string', example: '123 Main St' },
      { name: 'city', required: false, type: 'string', example: 'Boston' },
      { name: 'state', required: false, type: 'string', example: 'MA' },
      { name: 'postal_code', required: false, type: 'string', example: '02101' },
      { name: 'country', required: false, type: 'string', example: 'US' },
    ],
    headerRow: 'name,email,billing_contact,tax_id,currency,address_line1,city,state,postal_code,country',
  },
}

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

    const url = new URL(req.url)
    const type = url.searchParams.get('type') ?? 'samples'
    const template = TEMPLATES[type] ?? TEMPLATES.samples

    return new Response(
      JSON.stringify({
        type,
        fields: template.fields,
        templateUrl: null,
        headerRow: template.headerRow,
        exampleRow: template.fields.map((f) => f.example).join(','),
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
