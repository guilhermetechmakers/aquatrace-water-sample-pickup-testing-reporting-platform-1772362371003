/**
 * Attachments Delete Edge Function
 * Soft-deletes an attachment (sets is_deleted=true).
 * Only Lab Manager and Admin can delete. Audits the action.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    const body = req.method === 'POST' ? (await req.json()) as { attachmentId?: string } : {}
    const attachmentId = (body.attachmentId ?? (new URL(req.url).searchParams.get('attachmentId')) ?? '').trim()

    if (!attachmentId) {
      return new Response(JSON.stringify({ error: 'attachmentId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: att, error: fetchErr } = await supabaseAdmin
      .from('attachments')
      .select('id, is_deleted, uploaded_by_user_id')
      .eq('id', attachmentId)
      .maybeSingle()

    if (fetchErr || !att) {
      return new Response(JSON.stringify({ error: 'Attachment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const attRow = att as { uploaded_by_user_id?: string; is_deleted?: boolean }
    const { data: profile } = await supabaseAnon.from('profiles').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role ?? ''
    const isOwner = attRow.uploaded_by_user_id === user.id
    const canDelete = ['LAB_MANAGER', 'ADMIN'].includes(role) || isOwner

    if (!canDelete) {
      return new Response(JSON.stringify({ error: 'Forbidden: only Lab Manager, Admin, or owner can delete attachments' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (attRow.is_deleted) {
      return new Response(JSON.stringify({ message: 'Already deleted' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateErr } = await supabaseAdmin
      .from('attachments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', attachmentId)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseAdmin.from('attachment_audit').insert({
      attachment_id: attachmentId,
      action: 'deleted',
      performed_by: user.id,
      details: { softDelete: true },
    })

    return new Response(
      JSON.stringify({ attachmentId, message: 'Attachment deleted' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
