/**
 * Attachments Signed URL Edge Function
 * Generates signed upload URLs for direct-to-storage uploads.
 * Validates: relatedEntityType, relatedEntityId, fileName, mimeType, fileSize, attachmentType.
 * Creates attachment record in pending state; client uploads then calls confirm.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/csv', 'application/vnd.ms-excel', 'text/plain',
  'application/octet-stream',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ENTITY_TYPES = ['pickup', 'sample', 'lab_result', 'report', 'invoice']

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

    const body = (await req.json()) as {
      relatedEntityType?: string
      relatedEntityId?: string
      fileName?: string
      mimeType?: string
      fileSize?: number
      attachmentType?: string
    }

    const relatedEntityType = (body.relatedEntityType ?? '').trim()
    const relatedEntityId = (body.relatedEntityId ?? '').trim()
    const fileName = (body.fileName ?? '').trim()
    const mimeType = (body.mimeType ?? '').toLowerCase()
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : parseInt(String(body.fileSize ?? 0), 10)
    const attachmentType = (body.attachmentType ?? 'general').trim()

    if (!relatedEntityType || !relatedEntityId || !fileName || !mimeType) {
      return new Response(JSON.stringify({ error: 'relatedEntityType, relatedEntityId, fileName, mimeType required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ENTITY_TYPES.includes(relatedEntityType)) {
      return new Response(JSON.stringify({ error: 'Invalid relatedEntityType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ALLOWED_MIME.includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'File type not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size must be 1 byte to 10MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const attachmentId = crypto.randomUUID()
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${relatedEntityType}/${relatedEntityId}/${attachmentId}/${safeName}`

    const { data: attRow, error: insertErr } = await supabase
      .from('attachments')
      .insert({
        id: attachmentId,
        s3_key: storagePath,
        file_name: fileName,
        mime_type: mimeType,
        size: fileSize,
        uploaded_by_user_id: user.id,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        attachment_type: attachmentType,
        scan_status: 'pending',
      })
      .select('id, s3_key, uploaded_at')
      .single()

    if (insertErr || !attRow) {
      return new Response(JSON.stringify({ error: insertErr?.message ?? 'Failed to create attachment record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: signedData, error: uploadErr } = await supabase.storage
      .from('attachments')
      .createSignedUploadUrl(storagePath)

    if (uploadErr || !signedData?.signedUrl) {
      await supabase.from('attachments').delete().eq('id', attachmentId)
      return new Response(JSON.stringify({ error: uploadErr?.message ?? 'Failed to create signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    return new Response(
      JSON.stringify({
        attachmentId,
        signedUrl: signedData.signedUrl,
        path: signedData.path ?? storagePath,
        token: signedData.token ?? null,
        expiresAt,
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
