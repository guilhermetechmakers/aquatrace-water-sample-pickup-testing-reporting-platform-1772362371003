/**
 * Notifications Templates Edge Function
 * Create/update email templates with localization.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = (await req.json()) as {
      name?: string
      language?: string
      subject?: string
      html_body?: string
      text_body?: string
      version?: number
      is_published?: boolean
      template_id?: string
    }

    const name = body?.name ?? ''
    const language = body?.language ?? 'en'
    const templateId = body?.template_id ?? null

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const row: Record<string, unknown> = {
      name,
      language,
      subject: body?.subject ?? null,
      html_body: body?.html_body ?? null,
      text_body: body?.text_body ?? null,
      version: body?.version ?? 1,
      is_published: body?.is_published ?? false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    type TemplateRow = { id: string; name: string; language: string; subject: string | null; html_body: string | null; text_body: string | null; version: number; is_published: boolean; created_at: string; updated_at: string }
    let result: TemplateRow | null = null

    if (templateId) {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(row)
        .eq('id', templateId)
        .select()
        .single()
      if (error) throw error
      result = data as TemplateRow
    } else {
      row.created_by = user.id
      row.created_at = new Date().toISOString()
      const { data, error } = await supabase
        .from('notification_templates')
        .insert(row)
        .select()
        .single()
      if (error) throw error
      result = data as TemplateRow
    }

    const template = result
      ? {
          id: result.id,
          name: result.name,
          language: result.language,
          subject: result.subject,
          htmlBody: result.html_body,
          textBody: result.text_body,
          version: result.version,
          isPublished: result.is_published,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
        }
      : null

    return new Response(
      JSON.stringify({ template }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
