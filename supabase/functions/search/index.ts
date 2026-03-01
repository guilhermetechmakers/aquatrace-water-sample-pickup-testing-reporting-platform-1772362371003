/**
 * Search Edge Function
 * Unified search across samples, reports, customers, invoices.
 * Supports full-text search, faceted filters, pagination, RBAC.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ENTITY_TYPES = ['samples', 'reports', 'customers', 'invoices'] as const
type EntityType = (typeof ENTITY_TYPES)[number]

function parseFilters(filtersStr: string | null): Record<string, unknown> {
  if (!filtersStr) return {}
  try {
    const parsed = JSON.parse(filtersStr) as Record<string, unknown>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user } } = await supabaseAnon.auth.getUser()
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabaseAnon.from('profiles').select('role').eq('id', user.id).single()
    const role = (profile as { role?: string } | null)?.role ?? ''

    const url = new URL(req.url)
    const query = (url.searchParams.get('query') ?? '').trim()
    const type = (url.searchParams.get('type') ?? 'samples') as EntityType
    const filters = parseFilters(url.searchParams.get('filters'))
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20))
    const sortBy = url.searchParams.get('sort') ?? 'updated_at'
    const sortDir = url.searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc'

    const offset = (page - 1) * limit

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const filtersObj = filters as Record<string, string | string[] | undefined>
    const startDate = filtersObj?.startDate as string | undefined
    const endDate = filtersObj?.endDate as string | undefined
    const status = filtersObj?.status as string | string[] | undefined
    const customerId = filtersObj?.customerId as string | undefined
    const siteId = filtersObj?.siteId as string | undefined

    const statusArr = Array.isArray(status) ? status : status ? [status] : []

    let data: unknown[] = []
    let total = 0
    const facets: Record<string, string[]> = {}

    if (type === 'samples' || !type || type === '') {
      if (role === 'TECHNICIAN') {
        let q = supabase
          .from('pickups')
          .select('*', { count: 'exact' })
          .eq('technician_id', user.id)
          .order(sortBy === 'timestamp' ? 'sample_timestamp' : 'updated_at', { ascending: sortDir === 'asc' })
          .range(offset, offset + limit - 1)

        if (query) {
          q = q.or(`vial_id.ilike.%${query}%,sample_id.ilike.%${query}%,location.ilike.%${query}%,customer_site_notes.ilike.%${query}%,pickup_location_name.ilike.%${query}%`)
        }
        if (startDate) q = q.gte('sample_timestamp', startDate)
        if (endDate) q = q.lte('sample_timestamp', `${endDate}T23:59:59`)
        if (statusArr.length > 0) {
          const mapped = statusArr.map((s) => s.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase())
          q = q.in('status', mapped)
        }
        if (siteId) q = q.eq('site_id', siteId)

        const { data: rows, error, count } = await q
        if (error) throw error
        const list = rows ?? []
        data = list.map((r: Record<string, unknown>) => ({
          id: r.id,
          type: 'sample',
          sampleId: r.sample_id,
          vialId: r.vial_id,
          siteId: r.site_id,
          technicianId: r.technician_id,
          location: r.location,
          status: r.status,
          timestamp: r.sample_timestamp ?? r.updated_at,
          pH: (r.readings as Record<string, unknown>)?.pH ?? null,
          chlorine: (r.readings as Record<string, unknown>)?.chlorine ?? r.chlorine_reading ?? null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
        total = count ?? list.length
      } else if (['LAB_TECH', 'LAB_MANAGER', 'ADMIN'].includes(role)) {
        let q = supabase
          .from('pickups')
          .select('*', { count: 'exact' })
          .order(sortBy === 'timestamp' ? 'sample_timestamp' : 'updated_at', { ascending: sortDir === 'asc' })
          .range(offset, offset + limit - 1)

        if (query) {
          q = q.or(`vial_id.ilike.%${query}%.or.sample_id.ilike.%${query}%.or.location.ilike.%${query}%`)
        }
        if (startDate) q = q.gte('sample_timestamp', startDate)
        if (endDate) q = q.lte('sample_timestamp', `${endDate}T23:59:59`)
        if (statusArr.length > 0) {
          const mapped = statusArr.map((s) => s.toLowerCase().replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''))
          q = q.in('status', mapped)
        }
        if (siteId) q = q.eq('site_id', siteId)
        if (customerId) q = q.eq('customer_id', customerId)

        const { data: rows, error, count } = await q
        if (error) throw error
        const list = rows ?? []
        data = list.map((r: Record<string, unknown>) => ({
          id: r.id,
          type: 'sample',
          sampleId: r.sample_id,
          vialId: r.vial_id,
          siteId: r.site_id,
          technicianId: r.technician_id,
          location: r.location,
          status: r.status,
          timestamp: r.sample_timestamp ?? r.updated_at,
          pH: (r.readings as Record<string, unknown>)?.pH ?? null,
          chlorine: (r.readings as Record<string, unknown>)?.chlorine ?? r.chlorine_reading ?? null,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
        total = count ?? list.length
      }
    }

    if (type === 'reports' && ['LAB_TECH', 'LAB_MANAGER', 'ADMIN'].includes(role)) {
      let q = supabase
        .from('reports')
        .select('*, customers:customer_id(name)', { count: 'exact' })
        .order(sortBy === 'created_at' ? 'created_at' : 'updated_at', { ascending: sortDir === 'asc' })
        .range(offset, offset + limit - 1)

      if (query) q = q.ilike('report_id', `%${query}%`)
      if (statusArr.length > 0) q = q.in('status', statusArr)
      if (customerId) q = q.eq('customer_id', customerId)

      const { data: rows, error, count } = await q
      if (error) throw error
      const list = rows ?? []
      data = list.map((r: Record<string, unknown>) => ({
        id: r.id,
        type: 'report',
        reportId: r.report_id,
        customerId: r.customer_id,
        customerName: (r.customers as { name?: string })?.name ?? null,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
      total = count ?? list.length
    }

    if (type === 'customers' && ['LAB_MANAGER', 'ADMIN'].includes(role)) {
      let q = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order(sortBy === 'name' ? 'name' : 'updated_at', { ascending: sortDir === 'asc' })
        .range(offset, offset + limit - 1)

      if (query) q = q.or(`name.ilike.%${query}%.or.email.ilike.%${query}%`)

      const { data: rows, error, count } = await q
      if (error) throw error
      const list = rows ?? []
      data = list.map((r: Record<string, unknown>) => ({
        id: r.id,
        type: 'customer',
        name: r.name,
        email: r.email,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
      total = count ?? list.length
    }

    if (type === 'invoices' && ['LAB_MANAGER', 'ADMIN'].includes(role)) {
      let q = supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .order(sortBy === 'date' ? 'date' : 'updated_at', { ascending: sortDir === 'asc' })
        .range(offset, offset + limit - 1)

      if (query) q = q.ilike('invoice_id', `%${query}%`)
      if (statusArr.length > 0) q = q.in('status', statusArr)
      if (customerId) q = q.eq('customer_id', customerId)

      const { data: rows, error, count } = await q
      if (error) throw error
      const list = rows ?? []
      data = list.map((r: Record<string, unknown>) => ({
        id: r.id,
        type: 'invoice',
        invoiceId: r.invoice_id,
        customerId: r.customer_id,
        status: r.status,
        date: r.date,
        dueDate: r.due_date,
        amount: r.amount,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
      total = count ?? list.length
    }

    return new Response(
      JSON.stringify({
        data: data ?? [],
        total: total ?? 0,
        facets: facets ?? {},
        page,
        limit,
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
