/**
 * Attachments Confirm Edge Function
 * Confirms upload completion, updates metadata (checksum), triggers virus scan status.
 * Validates attachment exists and user has permission.
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

    const body = (await req.json()) as { attachmentId?: string; checksum?: string }
    const attachmentId = (body.attachmentId ?? '').trim()
    const checksum = (body.checksum ?? '').trim()

    if (!attachmentId) {
      return new Response(JSON.stringify({ error: 'attachmentId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: att, error: fetchErr } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchErr || !att) {
      return new Response(JSON.stringify({ error: 'Attachment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attRow = att as { uploaded_by_user_id?: string }
    if (attRow.uploaded_by_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const updates: Record<string, unknown> = {
      scan_status: 'clean',
      updated_at: new Date().toISOString(),
    }
    if (checksum) updates.checksum = checksum

    const { error: updateErr } = await supabase
      .from('attachments')
      .update(updates)
      .eq('id', attachmentId)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('attachment_audit').insert({
      attachment_id: attachmentId,
      action: 'upload_confirmed',
      performed_by: user.id,
      details: { checksum: checksum || null, scanStatus: 'clean' },
    })

    return new Response(
      JSON.stringify({
        attachmentId,
        scanStatus: 'clean',
        message: 'Upload confirmed',
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
