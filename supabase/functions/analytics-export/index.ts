/**
 * Analytics Export Edge Function
 * Generates CSV or PDF exports from analytics data.
 * Invoked when an analytics_exports record is created (status pending).
 * Stores result in Supabase Storage and updates record with file_url.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = (await req.json()) as { exportId?: string }
    const exportId = (body.exportId ?? '').trim()
    if (!exportId) {
      return new Response(JSON.stringify({ error: 'exportId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: exp, error: expErr } = await supabase
      .from('analytics_exports')
      .select('id, type, filter_snapshot')
      .eq('id', exportId)
      .single()

    if (expErr || !exp) {
      return new Response(JSON.stringify({ error: 'Export not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('analytics_exports')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', exportId)

    const filters = (exp.filter_snapshot as Record<string, unknown>) ?? {}
    const startDate = (filters.startDate as string) ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endDate = (filters.endDate as string) ?? new Date().toISOString().slice(0, 10)

    const startTs = new Date(startDate + 'T00:00:00Z').toISOString()
    const endTs = new Date(endDate + 'T23:59:59Z').toISOString()

    const { data: pickups } = await supabase
      .from('pickups')
      .select('id, location, status, created_at, completed_at')
      .gte('created_at', startTs)
      .lte('created_at', endTs)

    const { data: labResults } = await supabase
      .from('lab_results')
      .select('id, pickup_id, spc, total_coliform, status, created_at, approved_at')
      .gte('created_at', startTs)
      .lte('created_at', endTs)

    const pickupsList = Array.isArray(pickups) ? pickups : []
    const labList = Array.isArray(labResults) ? labResults : []

    let csvContent = ''
    const type = (exp.type as string) ?? 'csv'

    if (type === 'csv') {
      const headers = ['Date', 'Sample ID', 'Location', 'Status', 'SPC', 'Total Coliform', 'Lab Status']
      csvContent = headers.join(',') + '\n'
      for (const lr of labList) {
        const p = pickupsList.find((x: { id: string }) => x.id === (lr as { pickup_id: string }).pickup_id)
        const row = [
          (lr as { created_at: string }).created_at?.slice(0, 10) ?? '',
          (lr as { id: string }).id?.slice(0, 8) ?? '',
          (p as { location?: string })?.location ?? '',
          (p as { status?: string })?.status ?? '',
          (lr as { spc?: number }).spc ?? '',
          (lr as { total_coliform?: number }).total_coliform ?? '',
          (lr as { status: string }).status ?? '',
        ]
        csvContent += row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n'
      }
    }

    const fileName = `analytics-export-${exportId.slice(0, 8)}-${Date.now()}.${type === 'pdf' ? 'html' : 'csv'}`
    const bucket = 'analytics-exports'

    const { data: bucketList } = await supabase.storage.listBuckets()
    const bucketExists = Array.isArray(bucketList) && bucketList.some((b: { name: string }) => b.name === bucket)
    if (!bucketExists) {
      await supabase.storage.createBucket(bucket, { public: false })
    }

    const content = type === 'csv' ? csvContent : `<html><body><pre>${csvContent}</pre></body></html>`
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(fileName, new TextEncoder().encode(content), {
        contentType: type === 'csv' ? 'text/csv' : 'text/html',
        upsert: true,
      })

    if (uploadErr) {
      await supabase
        .from('analytics_exports')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', exportId)
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: urlData } = await supabase.storage.from(bucket).createSignedUrl(fileName, 3600 * 24 * 7)
    const fileUrl = urlData?.signedUrl ?? ''

    await supabase
      .from('analytics_exports')
      .update({
        status: 'completed',
        file_url: fileUrl,
        last_run: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', exportId)

    return new Response(
      JSON.stringify({ jobId: exportId, status: 'completed', fileUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
