/**
 * Data Export Edge Function
 * Initiates bulk export of samples, results, or invoices.
 * Creates job, fetches data, generates CSV/JSON, stores in data-exports bucket.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeCsv(val: unknown): string {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
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

    const body = (await req.json()) as {
      dataType?: string
      format?: string
      scope?: string
      filters?: Record<string, unknown>
    }
    const dataType = (body.dataType ?? 'samples') as string
    const format = (body.format ?? 'csv') as string
    const filters = (body.filters ?? {}) as Record<string, unknown>
    const dateFrom = (filters.dateFrom as string) ?? ''
    const dateTo = (filters.dateTo as string) ?? ''
    const customerId = (filters.customerId as string) ?? ''

    const { data: job, error: jobErr } = await supabase
      .from('data_export_jobs')
      .insert({
        requested_by: user.id,
        data_type: dataType,
        format,
        scope: body.scope ?? 'all',
        filters: body.filters ?? {},
        status: 'processing',
        progress: 0,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: jobErr?.message ?? 'Failed to create job' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobId = (job as { id: string }).id

    let rows: Record<string, unknown>[] = []
    let headers: string[] = []

    if (dataType === 'samples' || dataType === 'all') {
      let q = supabase.from('pickups').select('*')
      if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00Z')
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59Z')
      if (customerId) q = q.eq('customer_id', customerId)
      const { data: pickups } = await q
      const list = Array.isArray(pickups) ? pickups : []
      rows = list as Record<string, unknown>[]
      headers = Object.keys(rows[0] ?? {})
    }

    if (dataType === 'results' || (dataType === 'all' && rows.length === 0)) {
      let q = supabase.from('lab_results').select('*')
      if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00Z')
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59Z')
      const { data: results } = await q
      const list = Array.isArray(results) ? results : []
      rows = list as Record<string, unknown>[]
      headers = Object.keys(rows[0] ?? {})
    }

    if (dataType === 'invoices') {
      let q = supabase.from('invoices').select('*')
      if (dateFrom) q = q.gte('due_date', dateFrom)
      if (dateTo) q = q.lte('due_date', dateTo)
      if (customerId) q = q.eq('customer_id', customerId)
      const { data: invoices } = await q
      const list = Array.isArray(invoices) ? invoices : []
      rows = list as Record<string, unknown>[]
      headers = Object.keys(rows[0] ?? {})
    }

    const totalRows = rows.length
    const ext = format === 'json' ? 'json' : 'csv'
    let content: string

    if (format === 'json') {
      content = JSON.stringify(rows, null, 2)
    } else {
      content = headers.map(escapeCsv).join(',') + '\n'
      for (const row of rows) {
        content += headers.map((h) => escapeCsv(row[h])).join(',') + '\n'
      }
    }

    const fileName = `${jobId}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('data-exports')
      .upload(fileName, new TextEncoder().encode(content), {
        contentType: format === 'json' ? 'application/json' : 'text/csv',
        upsert: true,
      })

    if (uploadErr) {
      await supabase
        .from('data_export_jobs')
        .update({
          status: 'failed',
          error_message: uploadErr.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await supabase
      .from('data_export_jobs')
      .update({
        status: 'completed',
        progress: 100,
        total_rows: totalRows,
        download_token: token,
        completed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', jobId)

    await supabase.from('data_audit_log').insert({
      user_id: user.id,
      action: 'export',
      data_type: dataType,
      status: 'success',
      metadata: { jobId, format, totalRows },
    })

    return new Response(
      JSON.stringify({
        jobId,
        status: 'completed',
        downloadToken: token,
        totalRows,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
