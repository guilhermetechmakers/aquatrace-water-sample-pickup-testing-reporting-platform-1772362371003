/**
 * Reissue Report Edge Function
 * Creates a new version of an existing report with updated PDF.
 * Delegates to generate-report-pdf logic with incremented version.
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const functionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as {
      reportId?: string
      approvalId?: string
      customerId?: string
      pickupData?: Record<string, unknown>
      labResults?: Record<string, unknown>
      attachments?: Array<Record<string, unknown>>
      signature?: Record<string, unknown> | null
      auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
    }

    const reportId = payload.reportId ?? ''
    const approvalId = payload.approvalId ?? ''
    const customerId = payload.customerId ?? ''

    if (!reportId || !approvalId || !customerId) {
      return new Response(
        JSON.stringify({ error: 'reportId, approvalId, and customerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: reportRow } = await supabase
      .from('reports')
      .select('id, current_version, report_id')
      .eq('id', reportId)
      .single()

    if (!reportRow) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentVersion = (reportRow as { current_version?: number }).current_version ?? 1
    const newVersion = currentVersion + 1
    const reportIdText = (reportRow as { report_id?: string }).report_id ?? reportId

    const generatePayload = {
      approvalId,
      customerId,
      version: newVersion,
      pickupData: payload.pickupData ?? {},
      labResults: payload.labResults ?? {},
      attachments: payload.attachments ?? [],
      signature: payload.signature ?? null,
      auditTrail: payload.auditTrail ?? [],
    }

    const genRes = await fetch(`${functionsUrl}/generate-report-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(generatePayload),
    })

    if (!genRes.ok) {
      const err = await genRes.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ error: (err as { error?: string }).error ?? 'PDF generation failed' }),
        { status: genRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const genData = (await genRes.json()) as { reportId?: string; version?: number; pdfUrl?: string }

    await supabase.from('report_audit').insert({
      report_id: reportId,
      action: 'reissued',
      performed_at: new Date().toISOString(),
      note: `Reissued as v${newVersion}`,
    })

    return new Response(
      JSON.stringify({
        reportId: reportId,
        version: genData.version ?? newVersion,
        pdfUrl: genData.pdfUrl ?? '',
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
