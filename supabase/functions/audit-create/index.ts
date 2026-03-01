/**
 * Audit Create Edge Function
 * Creates append-only audit log entries with hash chaining for tamper-evidence.
 * Called from client when critical actions occur (approve, reject, sign-off, distribute, etc.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const VALID_ACTION_TYPES = [
  'READ', 'WRITE', 'APPROVE', 'REJECT', 'DOWNLOAD', 'SIGN_OFF', 'EXPORT', 'DISTRIBUTE', 'CREATE', 'UPDATE', 'DELETE',
]

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
      userId?: string
      userName?: string
      actionType?: string
      resourceType?: string
      resourceId?: string
      metadata?: Record<string, unknown>
      signed?: boolean
      signature?: string
    }

    const userId = (body.userId ?? user.id) as string
    const userName = (body.userName ?? user.email ?? '') as string
    const actionType = String(body.actionType ?? '').toUpperCase()
    const resourceType = String(body.resourceType ?? '')
    const resourceId = String(body.resourceId ?? '')
    const metadata = (body.metadata ?? {}) as Record<string, unknown>
    const signature = body.signature ? String(body.signature) : null

    if (!userId || !actionType || !resourceType || !resourceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, actionType, resourceType, resourceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return new Response(
        JSON.stringify({ error: `Invalid actionType. Must be one of: ${VALID_ACTION_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get previous hash for chain
    const { data: lastRow } = await supabase
      .from('audit_entries')
      .select('hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const previousHash = (lastRow as { hash?: string } | null)?.hash ?? ''

    const id = crypto.randomUUID()
    const timestamp = new Date().toISOString()
    const metadataStr = JSON.stringify(metadata, Object.keys(metadata).sort())
    const chainInput = `${previousHash}|${id}|${timestamp}|${actionType}|${resourceType}|${resourceId}|${metadataStr}`
    const hash = await sha256(chainInput)

    const { data: inserted, error } = await supabase
      .from('audit_entries')
      .insert({
        id,
        user_id: userId,
        user_name: userName || null,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp,
        metadata,
        hash,
        previous_hash: previousHash || null,
        signature,
      })
      .select('id, timestamp, hash')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        id: (inserted as { id: string }).id,
        timestamp: (inserted as { timestamp: string }).timestamp,
        hash: (inserted as { hash: string }).hash,
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
