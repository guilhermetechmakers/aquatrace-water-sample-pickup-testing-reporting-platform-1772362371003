/**
 * Data Import Validate Edge Function
 * Validates CSV file and returns preview with valid/invalid rows.
 * Does not commit data - use data-import-commit after user confirms.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const rows: string[][] = []
  for (const line of lines) {
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if (inQuotes) {
        current += c
      } else if (c === ',') {
        row.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    row.push(current.trim())
    rows.push(row)
  }
  return rows
}

function validateRow(
  headers: string[],
  values: string[],
  dataType: string
): { valid: boolean; errors: string[]; data: Record<string, unknown> } {
  const errors: string[] = []
  const data: Record<string, unknown> = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.trim().toLowerCase().replace(/\s/g, '_') ?? `col_${i}`
    const v = values[i]?.trim() ?? ''
    data[h] = v
  }

  if (dataType === 'samples') {
    const sid = (data.sample_id as string) ?? ''
    if (!sid) errors.push('sample_id is required')
    if (data.chlorine_reading && isNaN(parseFloat(String(data.chlorine_reading)))) {
      errors.push('chlorine_reading must be numeric')
    }
    if (data.vial_count && isNaN(parseInt(String(data.vial_count), 10))) {
      errors.push('vial_count must be integer')
    }
  } else if (dataType === 'results') {
    const sid = (data.sample_id as string) ?? ''
    if (!sid) errors.push('sample_id is required')
    if (data.spc != null && data.spc !== '' && isNaN(parseFloat(String(data.spc)))) {
      errors.push('spc must be numeric')
    }
    if (data.total_coliform != null && data.total_coliform !== '' && isNaN(parseFloat(String(data.total_coliform)))) {
      errors.push('total_coliform must be numeric')
    }
  } else if (dataType === 'invoices') {
    const invNum = (data.invoice_number as string) ?? ''
    const custId = (data.customer_id as string) ?? ''
    if (!invNum) errors.push('invoice_number is required')
    if (!custId) errors.push('customer_id is required')
    if (data.amount != null && data.amount !== '' && isNaN(parseFloat(String(data.amount)))) {
      errors.push('amount must be numeric')
    }
  } else if (dataType === 'customers') {
    const name = (data.name as string) ?? ''
    const email = (data.email as string) ?? ''
    if (!name) errors.push('name is required')
    if (!email) errors.push('email is required')
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email && !emailRe.test(email)) errors.push('email must be valid format')
  }

  return { valid: errors.length === 0, errors, data }
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

    const contentType = req.headers.get('Content-Type') ?? ''
    let csvText: string
    let dataType = 'samples'

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const typeParam = formData.get('type') as string | null
      if (typeParam) dataType = typeParam
      if (!file) {
        return new Response(JSON.stringify({ error: 'file required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      csvText = await file.text()
    } else {
      const body = (await req.json()) as { csv?: string; type?: string }
      csvText = body.csv ?? ''
      if (body.type) dataType = body.type
    }

    if (!csvText.trim()) {
      return new Response(JSON.stringify({ error: 'CSV content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      return new Response(
        JSON.stringify({
          jobId: null,
          status: 'validated',
          previewRows: [],
          validCount: 0,
          invalidCount: 0,
          errors: ['CSV must have header row and at least one data row'],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const headers = (rows[0] ?? []).map((h) => h.trim())
    const previewRows: { rowIndex: number; valid: boolean; errors: string[]; data: Record<string, unknown> }[] = []
    let validCount = 0
    let invalidCount = 0

    for (let i = 1; i < Math.min(rows.length, 101); i++) {
      const values = rows[i] ?? []
      const result = validateRow(headers, values, dataType)
      previewRows.push({
        rowIndex: i + 1,
        valid: result.valid,
        errors: result.errors,
        data: result.data,
      })
      if (result.valid) validCount++
      else invalidCount++
    }

    const totalValid = rows.slice(1).reduce((acc, _, i) => {
      const values = rows[i + 1] ?? []
      const r = validateRow(headers, values, dataType)
      return acc + (r.valid ? 1 : 0)
    }, 0)
    const totalInvalid = rows.length - 1 - totalValid

    return new Response(
      JSON.stringify({
        jobId: null,
        status: 'validated',
        previewRows,
        validCount: totalValid,
        invalidCount: totalInvalid,
        totalRows: rows.length - 1,
        headers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Validation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
