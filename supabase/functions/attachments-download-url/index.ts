/**
 * Attachments Download URL Edge Function
 * Generates short-lived signed download URLs for attachments.
 * Validates user has access to the attachment.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_EXPIRES = 3600

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST' && req.method !== 'GET') {
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
    const supabaseAnon = createClient(supabaseUrl, (Deno.env.get('SUPABASE_ANON_KEY') ?? ''), {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let attachmentId = ''
    let expiresIn = DEFAULT_EXPIRES

    if (req.method === 'POST') {
      const body = (await req.json()) as { attachmentId?: string; expiresIn?: number }
      attachmentId = (body.attachmentId ?? '').trim()
      expiresIn = typeof body.expiresIn === 'number' ? Math.min(86400, Math.max(60, body.expiresIn)) : DEFAULT_EXPIRES
    } else {
      const url = new URL(req.url)
      attachmentId = (url.searchParams.get('attachmentId') ?? '').trim()
      const exp = url.searchParams.get('expiresIn')
      if (exp) expiresIn = Math.min(86400, Math.max(60, parseInt(exp, 10) || DEFAULT_EXPIRES))
    }

    if (!attachmentId) {
      return new Response(JSON.stringify({ error: 'attachmentId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: att, error: fetchErr } = await supabase
      .from('attachments')
      .select('id, s3_key, uploaded_by_user_id, scan_status, is_deleted')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchErr || !att) {
      return new Response(JSON.stringify({ error: 'Attachment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attRow = att as { uploaded_by_user_id?: string; scan_status?: string; is_deleted?: boolean }
    if (attRow.is_deleted) {
      return new Response(JSON.stringify({ error: 'Attachment deleted' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAnon.from('profiles').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role ?? ''
    const canAccess = attRow.uploaded_by_user_id === user.id || ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'].includes(role)

    if (!canAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const storagePath = (att as { s3_key?: string }).s3_key ?? ''
    const { data: signedData, error: uploadErr } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, expiresIn)

    if (uploadErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: uploadErr?.message ?? 'Failed to create download URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('attachment_audit').insert({
      attachment_id: attachmentId,
      action: 'download_url_generated',
      performed_by: user.id,
      details: { expiresIn },
    })

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    return new Response(
      JSON.stringify({
        downloadUrl: signedData.signedUrl,
        expiresAt,
        expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
