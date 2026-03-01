/**
 * PDF Report Generation Edge Function
 * Generates signed PDF reports from approval data using DocRaptor API.
 * Requires: DOCRAPTOR_API_KEY secret (optional - without it, returns HTML for debugging)
 * Storage: Supabase Storage bucket 'reports'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return '—'
  const str = String(s)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? '—' : d.toLocaleString()
  } catch {
    return '—'
  }
}

function buildReportHtml(payload: {
  reportId?: string
  version?: number
  pickupData?: Record<string, unknown>
  labResults?: Record<string, unknown>
  attachments?: Array<{ filename?: string; fileType?: string }>
  signature?: Record<string, unknown> | null
  auditMetadata?: Record<string, unknown> & { entries?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }> }
  customerId?: string
}): string {
  const pd = payload.pickupData ?? {}
  const lr = payload.labResults ?? {}
  const att = payload.attachments ?? []
  const sig = payload.signature ?? null
  const meta = payload.auditMetadata ?? {}
  const auditEntries = Array.isArray((meta as { entries?: unknown[] }).entries) ? (meta as { entries: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }> }).entries : []

  const attachmentsList = Array.isArray(att) ? att : []

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Water Sample Report - AquaTrace</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, -apple-system, sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid rgb(0, 109, 100); padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: rgb(0, 109, 100); }
    .report-title { font-size: 18px; margin-top: 8px; }
    .meta { font-size: 10px; color: #64748b; margin-top: 4px; }
    section { margin-bottom: 24px; }
    h2 { font-size: 14px; color: rgb(0, 109, 100); margin: 0 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { font-weight: 600; color: #475569; width: 40%; }
    .signature-block { border: 1px solid #e2e8f0; padding: 16px; margin-top: 16px; max-width: 300px; }
    .signature-img { max-height: 60px; max-width: 200px; }
    .audit-entry { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; text-align: center; }
    .attachment-item { padding: 4px 0; font-size: 11px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AquaTrace</div>
    <div class="report-title">Water Sample Test Report</div>
    <div class="meta">
      Report ID: ${escapeHtml(payload.reportId ?? '—')} · Version: ${escapeHtml(String(payload.version ?? 1))} · 
      Generated: ${formatDate((meta.generated_at as string) ?? new Date().toISOString())} · 
      By: ${escapeHtml((meta.generated_by as string) ?? '—')}
    </div>
  </div>

  <section>
    <h2>Pickup Data</h2>
    <table>
      <tr><th>Technician</th><td>${escapeHtml((pd.technicianName as string) ?? '—')}</td></tr>
      <tr><th>Pickup Time</th><td>${formatDate((pd.pickupTime as string) ?? '')}</td></tr>
      <tr><th>GPS (Lat, Long)</th><td>${escapeHtml(String((pd.gpsLat ?? '—')))}, ${escapeHtml(String((pd.gpsLng ?? '—')))}</td></tr>
      <tr><th>Location</th><td>${escapeHtml((pd.location as string) ?? '—')}</td></tr>
      <tr><th>Vial IDs</th><td>${escapeHtml(Array.isArray(pd.vialIds) ? (pd.vialIds as string[]).join(', ') : (pd.vialIds as string) ?? '—')}</td></tr>
      <tr><th>Device ID</th><td>${escapeHtml((pd.deviceId as string) ?? '—')}</td></tr>
      <tr><th>pH</th><td>${escapeHtml(String((pd.pH ?? '—')))}</td></tr>
      <tr><th>Chlorine (ppm)</th><td>${escapeHtml(String((pd.chlorine ?? '—')))}</td></tr>
    </table>
  </section>

  <section>
    <h2>Lab Results</h2>
    <table>
      <tr><th>SPC Result</th><td>${escapeHtml(String((lr.spcResult ?? '—')))} ${escapeHtml((lr.spcUnit as string) ?? '')}</td></tr>
      <tr><th>SPC Reference</th><td>${escapeHtml((lr.spcReference as string) ?? '—')}</td></tr>
      <tr><th>Total Coliform Result</th><td>${escapeHtml(String((lr.totalColiformResult ?? '—')))} ${escapeHtml((lr.totalColiformUnit as string) ?? '')}</td></tr>
      <tr><th>Total Coliform Reference</th><td>${escapeHtml((lr.totalColiformReference as string) ?? '—')}</td></tr>
      <tr><th>Tested At</th><td>${formatDate((lr.testedAt as string) ?? '')}</td></tr>
      <tr><th>Tested By</th><td>${escapeHtml((lr.testedBy as string) ?? '—')}</td></tr>
    </table>
  </section>

  ${attachmentsList.length > 0 ? `
  <section>
    <h2>Attachments</h2>
    ${attachmentsList.map((a) => `<div class="attachment-item">${escapeHtml((a as { filename?: string }).filename ?? '—')} (${escapeHtml((a as { fileType?: string }).fileType ?? '—')})</div>`).join('')}
  </section>
  ` : ''}

  ${sig ? `
  <section>
    <h2>Manager Signature</h2>
    <div class="signature-block">
      ${(sig.signatureImageUrl as string) ? `<img src="${escapeHtml(sig.signatureImageUrl as string)}" alt="Signature" class="signature-img" />` : '<p>Signed electronically</p>'}
      <p><strong>${escapeHtml((sig.signerName as string) ?? '—')}</strong> · ${escapeHtml((sig.signerRole as string) ?? '—')}</p>
      <p>${formatDate((sig.signedAt as string) ?? '')}</p>
    </div>
  </section>
  ` : ''}

  ${auditEntries.length > 0 ? `
  <section>
    <h2>Audit Trail</h2>
    ${auditEntries.map((e) => `
    <div class="audit-entry">
      <strong>${escapeHtml((e.action ?? '—'))}</strong>
      ${(e.performedBy ?? '') ? ` · ${escapeHtml(e.performedBy)}` : ''}
      · ${formatDate(e.performedAt ?? '')}
      ${(e.note ?? '') ? ` · ${escapeHtml(e.note)}` : ''}
    </div>
    `).join('')}
  </section>
  ` : ''}

  <div class="footer">
    <p>Report ID: ${escapeHtml(payload.reportId ?? '—')} · Version ${escapeHtml(String(payload.version ?? 1))}</p>
    <p>AquaTrace Water Sample Pickup, Testing &amp; Reporting Platform · This report is for compliance and audit purposes. Records retained per regulatory requirements.</p>
  </div>
</body>
</html>`
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
    const docraptorKey = Deno.env.get('DOCRAPTOR_API_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as {
      approvalId?: string
      customerId?: string
      version?: number
      pickupData?: Record<string, unknown>
      labResults?: Record<string, unknown>
      attachments?: Array<Record<string, unknown>>
      signature?: Record<string, unknown> | null
      auditTrail?: Array<{ action?: string; performedBy?: string; performedAt?: string; note?: string }>
    }

    const approvalId = payload.approvalId ?? ''
    const customerId = payload.customerId ?? ''
    if (!approvalId || !customerId) {
      return new Response(
        JSON.stringify({ error: 'approvalId and customerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pickupData = payload.pickupData ?? {}
    const labResults = payload.labResults ?? {}
    const attachments = Array.isArray(payload.attachments) ? payload.attachments : []
    const signature = payload.signature ?? null

    const version = Math.max(1, Number(payload.version) ?? 1)

    const { data: existingReport } = await supabase
      .from('reports')
      .select('id, report_id')
      .eq('approval_id', approvalId)
      .maybeSingle()

    const reportIdText = existingReport
      ? ((existingReport as { report_id: string }).report_id)
      : `RPT-${approvalId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    const auditTrail = Array.isArray(payload.auditTrail) ? payload.auditTrail : []
    const html = buildReportHtml({
      reportId: reportIdText,
      version,
      pickupData,
      labResults,
      attachments,
      signature,
      auditMetadata: {
        created_at: new Date().toISOString(),
        generated_by: 'Lab Manager',
        version,
        entries: auditTrail.map((e) => ({
          action: e.action ?? '—',
          performedBy: e.performedBy ?? '',
          performedAt: e.performedAt ?? '',
          note: e.note ?? '',
        })),
      },
      customerId,
    })

    let pdfBuffer: ArrayBuffer
    let pdfUrl: string | null = null

    if (docraptorKey) {
      const docraptorRes = await fetch('https://docraptor.com/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${docraptorKey}`,
        },
        body: JSON.stringify({
          doc: { document_content: html, type: 'pdf', name: `${reportIdText}-v${version}.pdf` },
        }),
      })
      if (!docraptorRes.ok) {
        const errText = await docraptorRes.text()
        return new Response(
          JSON.stringify({ error: `DocRaptor error: ${errText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      pdfBuffer = await docraptorRes.arrayBuffer()
    } else {
      return new Response(
        JSON.stringify({
          error: 'PDF generation not configured. Set DOCRAPTOR_API_KEY secret for production.',
          htmlPreview: html.slice(0, 500) + '...',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const storagePath = `reports/${customerId}/${reportIdText}/v${version}.pdf`
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: urlData } = await supabase.storage.from('reports').createSignedUrl(storagePath, 3600)
    pdfUrl = urlData?.signedUrl ?? null

    let reportUuid: string
    if (existingReport) {
      reportUuid = (existingReport as { id: string }).id
      await supabase.from('reports').update({
        current_version: version,
        status: 'approved',
        updated_at: new Date().toISOString(),
      }).eq('id', reportUuid)
    } else {
      const { data: approval } = await supabase.from('approvals').select('result_id, sample_id').eq('id', approvalId).single()
      const resultId = approval ? (approval as { result_id?: string }).result_id : null
      const pickupId = approval ? (approval as { sample_id?: string }).sample_id : null

      const { data: inserted, error: insertErr } = await supabase
        .from('reports')
        .insert({
          customer_id: customerId,
          approval_id: approvalId,
          result_id: resultId ?? null,
          pickup_id: pickupId ?? null,
          report_id: reportIdText,
          current_version: version,
          status: 'approved',
          created_by: null,
        })
        .select('id')
        .single()

      if (insertErr) {
        return new Response(
          JSON.stringify({ error: `Report insert failed: ${insertErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      reportUuid = (inserted as { id: string }).id
    }

    await supabase.from('report_versions').upsert({
      report_id: reportUuid,
      version,
      status: 'approved',
      pdf_storage_path: storagePath,
      generated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }, { onConflict: 'report_id,version' })

    await supabase.from('report_audit').insert({
      report_id: reportUuid,
      action: 'created',
      performed_at: new Date().toISOString(),
      note: `PDF generated v${version}`,
    })

    return new Response(
      JSON.stringify({
        reportId: reportUuid,
        version,
        pdfUrl: pdfUrl ?? '',
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
