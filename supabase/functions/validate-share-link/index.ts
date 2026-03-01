/**
 * Validate Share Link Edge Function
 * Public endpoint - validates token and returns signed URL for report/invoice.
 * No auth required. Uses service role to bypass RLS.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') ?? url.pathname.split('/').pop()
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: linkRow, error: linkError } = await supabase
      .from('share_links')
      .select('id, tenant_id, target_type, target_id, expires_at, revoked_at, usage_count')
      .eq('token', token)
      .maybeSingle()

    if (linkError || !linkRow) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const row = linkRow as {
      id: string
      tenant_id: string
      target_type: string
      target_id: string
      expires_at: string
      revoked_at: string | null
      usage_count: number
    }

    if (row.revoked_at) {
      return new Response(
        JSON.stringify({ error: 'Link has been revoked' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(row.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Link has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Increment usage count
    await supabase
      .from('share_links')
      .update({ usage_count: (row.usage_count ?? 0) + 1 })
      .eq('id', row.id)

    // Log share link usage
    await supabase.from('portal_audit_log').insert({
      tenant_id: row.tenant_id,
      user_id: null,
      action: 'share_link_used',
      item_type: row.target_type,
      item_id: row.target_id,
      metadata: { share_link_id: row.id },
    })

    let signedUrl: string | null = null
    if (row.target_type === 'report') {
      const { data: versionRow } = await supabase
        .from('report_versions')
        .select('pdf_storage_path')
        .eq('report_id', row.target_id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      const storagePath = (versionRow as { pdf_storage_path?: string } | null)?.pdf_storage_path
      if (storagePath) {
        const { data: signed } = await supabase.storage
          .from('reports')
          .createSignedUrl(storagePath, 3600)
        signedUrl = signed?.signedUrl ?? null
      }
    } else if (row.target_type === 'invoice') {
      const { data: invRow } = await supabase
        .from('invoices')
        .select('pdf_path')
        .eq('id', row.target_id)
        .maybeSingle()

      const pdfPath = (invRow as { pdf_path?: string } | null)?.pdf_path
      if (pdfPath) {
        try {
          const { data: signed } = await supabase.storage
            .from('invoices')
            .createSignedUrl(pdfPath, 3600)
          signedUrl = signed?.signedUrl ?? null
        } catch {
          const { data: signed } = await supabase.storage
            .from('reports')
            .createSignedUrl(pdfPath, 3600)
          signedUrl = signed?.signedUrl ?? null
        }
      }
    }

    if (!signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Document not yet available', targetType: row.target_type, targetId: row.target_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        targetType: row.target_type,
        targetId: row.target_id,
        url: signedUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
