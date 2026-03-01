/**
 * Data Export Status Edge Function
 * Returns export job status, progress, and download URL.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    const jobId = url.searchParams.get('jobId') ?? url.pathname.split('/').pop() ?? ''

    if (!jobId || jobId === 'data-export-status') {
      return new Response(JSON.stringify({ error: 'jobId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
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

    const supabase = supabaseAnon
    const { data: job, error } = await supabase
      .from('data_export_jobs')
      .select('id, status, progress, total_rows, download_url, expires_at, error_message, created_at, completed_at')
      .eq('id', jobId)
      .eq('requested_by', user.id)
      .maybeSingle()

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const j = job as Record<string, unknown>
    return new Response(
      JSON.stringify({
        jobId: j.id,
        status: j.status,
        progress: j.progress ?? 0,
        totalRows: j.total_rows ?? 0,
        downloadUrl: j.download_url ?? null,
        expiresAt: j.expires_at ?? null,
        errorMessage: j.error_message ?? null,
        createdAt: j.created_at,
        completedAt: j.completed_at ?? null,
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
