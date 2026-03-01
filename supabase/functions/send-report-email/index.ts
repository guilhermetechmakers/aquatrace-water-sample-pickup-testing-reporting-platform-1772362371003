/**
 * Send Report Email Edge Function
 * Sends PDF report to customer via SendGrid.
 * Requires: SENDGRID_API_KEY secret
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
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY') ?? ''

    if (!sendgridKey) {
      return new Response(
        JSON.stringify({ error: 'Email not configured. Set SENDGRID_API_KEY secret.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as {
      reportId?: string
      version?: number
      recipient?: string
      customerName?: string
      reportTitle?: string
      pickupDate?: string
    }

    const reportId = payload.reportId ?? ''
    const version = payload.version ?? 1
    const recipient = payload.recipient ?? ''
    const customerName = payload.customerName ?? 'Customer'
    const reportTitle = payload.reportTitle ?? 'Water Sample Test Report'
    const pickupDate = payload.pickupDate ?? new Date().toLocaleDateString()

    if (!reportId || !recipient) {
      return new Response(
        JSON.stringify({ error: 'reportId and recipient are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: reportRow } = await supabase
      .from('reports')
      .select('id')
      .eq('id', reportId)
      .single()

    if (!reportRow) {
      return new Response(
        JSON.stringify({ error: 'Report not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: versionRow } = await supabase
      .from('report_versions')
      .select('pdf_storage_path')
      .eq('report_id', reportId)
      .eq('version', version)
      .single()

    const storagePath = versionRow ? (versionRow as { pdf_storage_path?: string }).pdf_storage_path : null
    if (!storagePath) {
      return new Response(
        JSON.stringify({ error: 'Report version not found or PDF not generated' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: signedUrlData } = await supabase.storage.from('reports').createSignedUrl(storagePath, 86400)
    const pdfUrl = signedUrlData?.signedUrl ?? ''

    const pdfRes = await fetch(pdfUrl)
    const pdfBuffer = await pdfRes.arrayBuffer()
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))

    const emailBody = {
      personalizations: [{ to: [{ email: recipient }] }],
      from: { email: Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'noreply@aquatrace.com', name: 'AquaTrace' },
      subject: `${reportTitle} - ${pickupDate}`,
      content: [
        {
          type: 'text/html',
          value: `
            <p>Dear ${customerName},</p>
            <p>Please find attached your Water Sample Test Report.</p>
            <p><strong>Report:</strong> ${reportTitle}</p>
            <p><strong>Pickup Date:</strong> ${pickupDate}</p>
            <p>If you have any questions, please contact your lab manager.</p>
            <p>— AquaTrace Team</p>
          `,
        },
      ],
      attachments: [
        {
          content: pdfBase64,
          filename: `Water-Sample-Report-v${version}.pdf`,
          type: 'application/pdf',
        },
      ],
    }

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sendgridKey}`,
      },
      body: JSON.stringify(emailBody),
    })

    if (!sgRes.ok) {
      const errText = await sgRes.text()
      return new Response(
        JSON.stringify({ error: `SendGrid error: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const messageId = sgRes.headers.get('x-message-id') ?? undefined

    await supabase.from('report_emails').insert({
      report_id: reportId,
      version,
      recipient,
      status: 'sent',
      sent_at: new Date().toISOString(),
      response: JSON.stringify({ messageId }),
    })

    await supabase.from('report_audit').insert({
      report_id: reportId,
      action: 'emailed',
      performed_at: new Date().toISOString(),
      note: `Emailed to ${recipient}`,
    })

    return new Response(
      JSON.stringify({ success: true, messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
