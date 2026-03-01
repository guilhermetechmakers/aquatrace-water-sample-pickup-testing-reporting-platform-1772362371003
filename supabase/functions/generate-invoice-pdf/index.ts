/**
 * Generate Invoice PDF Edge Function
 * Creates a PDF from invoice data for download/email.
 * Uses DocRaptor if DOCRAPTOR_API_KEY is set; otherwise returns HTML for client-side print.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return '—'
  return String(s)
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
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function buildInvoiceHtml(payload: {
  invoiceId?: string
  customerName?: string
  dueDate?: string
  issueDate?: string
  items?: Array<{ description?: string; quantity?: number; unitPrice?: number; lineTotal?: number }>
  subtotal?: number
  taxes?: number
  discounts?: number
  totalAmount?: number
  currency?: string
}): string {
  const items = Array.isArray(payload.items) ? payload.items : []
  const rows = items.map(
    (it) =>
      `<tr><td>${escapeHtml(it.description ?? '')}</td><td class="text-right">${it.quantity ?? 0}</td><td class="text-right">${formatCurrency(it.unitPrice ?? 0)}</td><td class="text-right">${formatCurrency(it.lineTotal ?? (it.quantity ?? 0) * (it.unitPrice ?? 0))}</td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escapeHtml(payload.invoiceId ?? '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Inter, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid rgb(0, 109, 100); padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: rgb(0, 109, 100); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { font-weight: 600; }
    .text-right { text-align: right; }
    .total-row { font-weight: 700; font-size: 14px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AquaTrace</div>
    <h1>Invoice ${escapeHtml(payload.invoiceId ?? '')}</h1>
    <p>Customer: ${escapeHtml(payload.customerName ?? '')}</p>
    <p>Due: ${formatDate(payload.dueDate)} · Issue: ${formatDate(payload.issueDate)}</p>
  </div>
  <table>
    <thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="margin-top: 16px; text-align: right;">
    ${(payload.taxes ?? 0) > 0 ? `<p>Taxes: ${formatCurrency(payload.taxes ?? 0)}</p>` : ''}
    ${(payload.discounts ?? 0) > 0 ? `<p>Discounts: -${formatCurrency(payload.discounts ?? 0)}</p>` : ''}
    <p class="total-row">Total: ${formatCurrency(payload.totalAmount ?? 0)}</p>
  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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
    const docraptorKey = Deno.env.get('DOCRAPTOR_API_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as {
      invoiceId?: string
      customerId?: string
    }

    const invoiceId = payload.invoiceId ?? ''
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: invRow, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .maybeSingle()

    if (invErr || !invRow) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const inv = invRow as Record<string, unknown>
    const customerId = inv.customer_id as string
    let customerName = ''
    if (customerId) {
      const { data: custRow } = await supabase
        .from('customers')
        .select('name')
        .eq('id', customerId)
        .maybeSingle()
      customerName = (custRow as { name?: string } | null)?.name ?? ''
    }
    const { data: itemRows } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    const items = Array.isArray(itemRows) ? itemRows : []

    const html = buildInvoiceHtml({
      invoiceId: (inv.invoice_id as string) ?? (inv.id as string),
      customerName,
      dueDate: (inv.due_date as string) ?? '',
      issueDate: (inv.issue_date as string) ?? '',
      items: items.map((r: Record<string, unknown>) => ({
        description: r.description as string,
        quantity: Number(r.quantity ?? 1),
        unitPrice: Number(r.unit_price ?? 0),
        lineTotal: Number(r.line_total ?? 0),
      })),
      taxes: Number(inv.taxes ?? 0),
      discounts: Number(inv.discounts ?? 0),
      totalAmount: Number(inv.amount ?? 0),
    })

    if (docraptorKey) {
      const docraptorRes = await fetch('https://docraptor.com/docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${docraptorKey}`,
        },
        body: JSON.stringify({
          doc: { document_content: html, type: 'pdf', name: `invoice-${inv.invoice_id ?? invoiceId}.pdf` },
        }),
      })
      if (!docraptorRes.ok) {
        const errText = await docraptorRes.text()
        return new Response(JSON.stringify({ error: `PDF generation failed: ${errText}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const pdfBuffer = await docraptorRes.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)))
      return new Response(
        JSON.stringify({ pdfBase64: base64, filename: `invoice-${inv.invoice_id ?? invoiceId}.pdf` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ html }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
