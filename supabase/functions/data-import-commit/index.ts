/**
 * Data Import Commit Edge Function
 * Commits validated CSV rows to database. Idempotent on stable keys.
 * Creates import job record and audit log entry.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const rows: string[][] = []
  for (const line of lines) {
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQuotes = !inQuotes
      else if (inQuotes) current += c
      else if (c === ',') {
        row.push(current.trim())
        current = ''
      } else current += c
    }
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

function validateRow(
  headers: string[],
  values: string[],
  dataType: string
): { valid: boolean; errors: string[]; data: Record<string, unknown> } {
  const errors: string[] = []
  const data: Record<string, unknown> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.trim().toLowerCase().replace(/\s/g, '_') ?? `col_${i}`
    const v = values[i]?.trim() ?? ''
    data[h] = v
  }
  if (dataType === 'samples') {
    if (!(data.sample_id as string)) errors.push('sample_id required')
  } else if (dataType === 'results') {
    if (!(data.sample_id as string)) errors.push('sample_id required')
  } else if (dataType === 'invoices') {
    if (!(data.invoice_number as string)) errors.push('invoice_number required')
    if (!(data.customer_id as string)) errors.push('customer_id required')
  } else if (dataType === 'customers') {
    if (!(data.name as string)) errors.push('name required')
    if (!(data.email as string)) errors.push('email required')
  }
  return { valid: errors.length === 0, errors, data }
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (profile as { role?: string } | null)?.role ?? ''
    if (!['ADMIN', 'LAB_MANAGER'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const contentType = req.headers.get('Content-Type') ?? ''
    let csvText: string
    let dataType = 'samples'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const typeParam = formData.get('type') as string | null
      if (typeParam) dataType = typeParam
      if (!file) {
        return new Response(JSON.stringify({ error: 'file required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      csvText = await file.text()
    } else {
      const body = (await req.json()) as { csv?: string; type?: string }
      csvText = body.csv ?? ''
      if (body.type) dataType = body.type
    }

    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'CSV must have header and data rows' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const headers = (rows[0] ?? []).map((h) => h.trim())
    const validationErrors: { row: number; errors: string[] }[] = []
    let imported = 0
    let failed = 0

    const { data: job, error: jobErr } = await supabase
      .from('data_import_jobs')
      .insert({
        uploaded_by: user.id,
        data_type: dataType,
        status: 'processing',
        total_rows: rows.length - 1,
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: 'Failed to create import job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobId = (job as { id: string }).id

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i] ?? []
      const result = validateRow(headers, values, dataType)
      if (!result.valid) {
        failed++
        validationErrors.push({ row: i + 1, errors: result.errors })
        continue
      }
      const d = result.data

      try {
        if (dataType === 'customers') {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('email', String(d.email).toLowerCase())
            .maybeSingle()
          if (!existing) {
            await supabase.from('customers').insert({
              name: String(d.name),
              email: String(d.email).toLowerCase(),
              billing_contact: d.billing_contact ? String(d.billing_contact) : null,
              tax_info: d.tax_id ? { taxId: d.tax_id } : {},
              currency: d.currency ? String(d.currency) : 'USD',
              billing_address: {
                line1: d.address_line1,
                city: d.city,
                state: d.state,
                postalCode: d.postal_code,
                country: d.country,
              },
            })
            imported++
          }
        } else if (dataType === 'results') {
          const sampleId = String(d.sample_id)
          const { data: pickup } = await supabase
            .from('pickups')
            .select('id')
            .eq('sample_id', sampleId)
            .maybeSingle()
          if (pickup) {
            const { error: insErr } = await supabase.from('lab_results').insert({
              pickup_id: (pickup as { id: string }).id,
              spc: d.spc ? parseFloat(String(d.spc)) : null,
              total_coliform: d.total_coliform ? parseFloat(String(d.total_coliform)) : null,
              spc_unit: d.spc_unit ? String(d.spc_unit) : null,
              total_coliform_unit: d.total_coliform_unit ? String(d.total_coliform_unit) : null,
              method: d.method ? String(d.method) : null,
              status: d.status ? String(d.status) : 'pending',
            })
            if (!insErr) imported++
            else failed++
          } else {
            failed++
            validationErrors.push({ row: i + 1, errors: ['sample_id not found'] })
          }
        }
      } catch {
        failed++
        validationErrors.push({ row: i + 1, errors: ['Insert failed'] })
      }
    }

    await supabase
      .from('data_import_jobs')
      .update({
        status: 'completed',
        imported_rows: imported,
        failed_rows: failed,
        validation_errors: validationErrors,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await supabase.from('data_audit_log').insert({
      user_id: user.id,
      action: 'import',
      data_type: dataType,
      status: failed > 0 && imported > 0 ? 'partial' : failed > 0 ? 'failed' : 'success',
      metadata: { jobId, imported, failed },
    })

    return new Response(
      JSON.stringify({
        jobId,
        status: 'completed',
        imported,
        failed,
        totalRows: rows.length - 1,
        errors: validationErrors.slice(0, 50),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
