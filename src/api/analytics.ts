/**
 * Analytics & Reporting API
 * KPIs, trends, SLA alerts, exports - aggregates from Supabase production data
 */

import { supabase } from '@/lib/supabase'
import type {
  KPISummary,
  KPIAggregate,
  TrendDataPoint,
  SLAAlert,
  AnalyticsExport,
  AnalyticsFilters,
  ErrorRateBreakdown,
} from '@/types/analytics'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

function defaultDateRange(): { start: string; end: string } {
  const end = new Date()
  const start = subDays(end, 30)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

/** Fetch KPI summary for dashboard */
export async function fetchKPIs(
  filters?: AnalyticsFilters
): Promise<{ data: KPIAggregate[]; summary: KPISummary }> {
  if (!isSupabaseConfigured()) {
    return {
      data: [],
      summary: {
        avgTurnaroundTimeHours: 0,
        onTimeDeliveries: 0,
        totalOnTime: 0,
        testVolumeByType: {},
        totalTestVolume: 0,
        revenueYtd: 0,
        arAging: 0,
        slaCompliancePercent: 0,
        totalSamples: 0,
        totalReports: 0,
      },
    }
  }

  const { start, end } = defaultDateRange()
  const startDate = filters?.startDate ?? start
  const endDate = filters?.endDate ?? end

  const startTs = startOfDay(new Date(startDate)).toISOString()
  const endTs = endOfDay(new Date(endDate)).toISOString()

  // Pickups in range
  let pickupsQ = supabase
    .from('pickups')
    .select('id, completed_at, created_at, customer_id, technician_id')
    .gte('created_at', startTs)
    .lte('created_at', endTs)

  if (filters?.customerId) pickupsQ = pickupsQ.eq('customer_id', filters.customerId)
  if (filters?.technicianId) pickupsQ = pickupsQ.eq('technician_id', filters.technicianId)

  const { data: pickupsData } = await pickupsQ
  const pickups = Array.isArray(pickupsData) ? pickupsData : []
  const pickupIds = pickups.map((p: { id: string }) => p.id)

  // Lab results for those pickups
  type LabResultRow = { id: string; pickup_id: string; status: string; approved_at: string | null; created_at: string; spc?: number; total_coliform?: number }
  let labResults: LabResultRow[] = []
  if (pickupIds.length > 0) {
    const { data: lrData } = await supabase
      .from('lab_results')
      .select('id, pickup_id, status, approved_at, created_at, spc, total_coliform')
      .in('pickup_id', pickupIds)
    labResults = Array.isArray(lrData) ? lrData : []
  }

  // Approvals for SLA
  const approvalIds = labResults.map((r: { id: string }) => r.id)
  let approvals: { result_id: string; status: string; sla_due: string | null; created_at: string }[] = []
  if (approvalIds.length > 0) {
    const { data: appData } = await supabase
      .from('approvals')
      .select('result_id, status, sla_due, created_at')
      .in('result_id', approvalIds)
    approvals = Array.isArray(appData) ? appData : []
  }

  // Invoices for revenue
  let invoicesQ = supabase
    .from('invoices')
    .select('amount, status, due_date')
    .gte('date', startDate)
    .lte('date', endDate)

  if (filters?.customerId) invoicesQ = invoicesQ.eq('customer_id', filters.customerId)
  const { data: invData } = await invoicesQ
  const invoices = Array.isArray(invData) ? invData : []

  const totalRevenue = invoices.reduce(
    (sum: number, i: { amount?: number; status?: string }) =>
      sum + (i.status === 'paid' ? Number(i.amount ?? 0) : 0),
    0
  )

  const arAging = invoices.reduce(
    (sum: number, i: { amount?: number; status?: string; due_date?: string }) => {
      if (i.status !== 'paid' && i.status !== 'refunded' && Number(i.amount ?? 0) > 0) {
        return sum + Number(i.amount ?? 0)
      }
      return sum
    },
    0
  )

  // Turnaround: pickup completed_at -> lab approved_at
  const approvedResults = labResults.filter((r: { status: string }) => r.status === 'approved')
  let totalTurnaround = 0
  let turnaroundCount = 0
  for (const r of approvedResults) {
    const pickup = pickups.find((p: { id: string }) => p.id === r.pickup_id)
    const completedAt = pickup ? (pickup as { completed_at: string | null }).completed_at : null
    const approvedAt = r.approved_at
    if (completedAt && approvedAt) {
      const hrs = (new Date(approvedAt).getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60)
      totalTurnaround += hrs
      turnaroundCount++
    }
  }
  const avgTurnaroundTimeHours = turnaroundCount > 0 ? totalTurnaround / turnaroundCount : 0

  // SLA: approvals with sla_due
  const slaDueApprovals = approvals.filter((a: { sla_due: string | null }) => a.sla_due)
  const onTime = slaDueApprovals.filter(
    (a: { sla_due: string | null; status: string }) =>
      a.sla_due && new Date(a.sla_due) >= new Date() || a.status === 'approved'
  ).length
  const slaCompliancePercent =
    slaDueApprovals.length > 0 ? Math.round((onTime / slaDueApprovals.length) * 100) : 100

  // Test volume by type (simplified: SPC vs Total Coliform from lab_results)
  const testVolumeByType: Record<string, number> = {
    SPC: labResults.filter((r) => (r as LabResultRow).spc != null).length,
    TotalColiform: labResults.filter((r) => (r as LabResultRow).total_coliform != null).length,
  }
  const totalTestVolume = labResults.length

  const summary: KPISummary = {
    avgTurnaroundTimeHours: Math.round(avgTurnaroundTimeHours * 10) / 10,
    onTimeDeliveries: onTime,
    totalOnTime: slaDueApprovals.length,
    testVolumeByType,
    totalTestVolume,
    revenueYtd: totalRevenue,
    arAging,
    slaCompliancePercent,
    totalSamples: pickups.length,
    totalReports: approvedResults.length,
  }

  return {
    data: [],
    summary,
  }
}

/** Fetch trend data for a metric */
export async function fetchTrends(
  metric: string,
  filters?: AnalyticsFilters,
  granularity: 'day' | 'week' | 'month' = 'week'
): Promise<{ data: TrendDataPoint[] }> {
  if (!isSupabaseConfigured()) {
    return { data: [] }
  }

  const { start, end } = defaultDateRange()
  const startDate = filters?.startDate ?? start
  const endDate = filters?.endDate ?? end

  const startTs = startOfDay(new Date(startDate)).toISOString()
  const endTs = endOfDay(new Date(endDate)).toISOString()

  if (metric === 'turnaround') {
    const { data: lrData } = await supabase
      .from('lab_results')
      .select('pickup_id, approved_at')
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .gte('approved_at', startTs)
      .lte('approved_at', endTs)

    const results = Array.isArray(lrData) ? lrData : []
    const { data: pickupsData } = await supabase
      .from('pickups')
      .select('id, completed_at')
      .in('id', results.map((r: { pickup_id: string }) => r.pickup_id))

    const pickups = Array.isArray(pickupsData) ? pickupsData : []
    const pickupMap = Object.fromEntries(pickups.map((p: { id: string; completed_at: string }) => [p.id, p.completed_at]))

    const byDate: Record<string, number[]> = {}
    const fmt = granularity === 'day' ? 'yyyy-MM-dd' : granularity === 'week' ? 'yyyy-ww' : 'yyyy-MM'
    for (const r of results) {
      const completedAt = pickupMap[(r as { pickup_id: string }).pickup_id]
      const approvedAt = (r as { approved_at: string }).approved_at
      if (completedAt && approvedAt) {
        const d = format(new Date(approvedAt), fmt)
        if (!byDate[d]) byDate[d] = []
        byDate[d].push((new Date(approvedAt).getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60))
      }
    }
    const data: TrendDataPoint[] = Object.entries(byDate).map(([date, vals]) => ({
      date,
      value: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
    }))
    data.sort((a, b) => a.date.localeCompare(b.date))
    return { data }
  }

  if (metric === 'revenue') {
    const { data: invData } = await supabase
      .from('invoices')
      .select('date, amount, status')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'paid')

    const invoices = Array.isArray(invData) ? invData : []
    const byDate: Record<string, number> = {}
    const fmt = granularity === 'day' ? 'yyyy-MM-dd' : granularity === 'week' ? 'yyyy-ww' : 'yyyy-MM'
    for (const i of invoices) {
      const d = format(new Date((i as { date: string }).date), fmt)
      byDate[d] = (byDate[d] ?? 0) + Number((i as { amount: number }).amount ?? 0)
    }
    const data: TrendDataPoint[] = Object.entries(byDate).map(([date, value]) => ({ date, value }))
    data.sort((a, b) => a.date.localeCompare(b.date))
    return { data }
  }

  if (metric === 'testVolume') {
    const { data: lrData } = await supabase
      .from('lab_results')
      .select('created_at')
      .gte('created_at', startTs)
      .lte('created_at', endTs)

    const results = Array.isArray(lrData) ? lrData : []
    const byDate: Record<string, number> = {}
    const fmt = granularity === 'day' ? 'yyyy-MM-dd' : granularity === 'week' ? 'yyyy-ww' : 'yyyy-MM'
    for (const r of results) {
      const d = format(new Date((r as { created_at: string }).created_at), fmt)
      byDate[d] = (byDate[d] ?? 0) + 1
    }
    const data: TrendDataPoint[] = Object.entries(byDate).map(([date, value]) => ({ date, value }))
    data.sort((a, b) => a.date.localeCompare(b.date))
    return { data }
  }

  return { data: [] }
}

/** Fetch SLA alerts */
export async function fetchSLAAlerts(
  status: 'open' | 'acknowledged' | 'resolved' | '' = 'open',
  limit = 100
): Promise<{ data: SLAAlert[] }> {
  if (!isSupabaseConfigured()) {
    return { data: [] }
  }

  const { data: rows } = await supabase
    .from('sla_alerts')
    .select('*')
    .order('breach_time', { ascending: false })
    .limit(limit)

  const raw = rows ?? []
  const list = Array.isArray(raw) ? raw : []

  let filtered = list
  if (status) {
    filtered = list.filter((r: { status: string }) => r.status === status)
  }

  const data: SLAAlert[] = filtered.map((r: Record<string, unknown>) => ({
    id: (r.id as string) ?? '',
    customerId: (r.customer_id as string) ?? null,
    customerName: (r.customer_name as string) ?? undefined,
    workflowStage: (r.workflow_stage as string) ?? '',
    breachTime: (r.breach_time as string) ?? '',
    severity: ((r.severity as string) ?? 'medium') as SLAAlert['severity'],
    status: ((r.status as string) ?? 'open') as SLAAlert['status'],
    resolvedAt: (r.resolved_at as string) ?? null,
    notes: (r.notes as string) ?? null,
    affectedOrderIds: Array.isArray(r.affected_order_ids) ? (r.affected_order_ids as string[]) : undefined,
    createdAt: (r.created_at as string) ?? '',
  }))

  return { data }
}

/** Acknowledge an SLA alert */
export async function acknowledgeSLAAlert(
  alertId: string,
  notes?: string,
  _userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  await supabase
    .from('sla_alerts')
    .update({
      status: 'acknowledged',
      notes: notes ?? null,
      resolved_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
}

/** Resolve an SLA alert */
export async function resolveSLAAlert(
  alertId: string,
  notes?: string,
  _userId?: string
): Promise<void> {
  if (!isSupabaseConfigured()) return

  await supabase
    .from('sla_alerts')
    .update({
      status: 'resolved',
      notes: notes ?? null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
}

/** Fetch error rate breakdown by stage */
export async function fetchErrorRates(
  filters?: AnalyticsFilters
): Promise<{ data: ErrorRateBreakdown[] }> {
  if (!isSupabaseConfigured()) {
    return { data: [] }
  }

  const { start, end } = defaultDateRange()
  const startDate = filters?.startDate ?? start
  const endDate = filters?.endDate ?? end
  const startTs = startOfDay(new Date(startDate)).toISOString()
  const endTs = endOfDay(new Date(endDate)).toISOString()

  const counts: { stage: string; count: number }[] = []

  const { count: pErrors } = await supabase
    .from('pickups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startTs)
    .lte('created_at', endTs)
    .eq('status', 'rejected')
  counts.push({ stage: 'Pickup', count: pErrors ?? 0 })

  const { count: lErrors } = await supabase
    .from('lab_results')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startTs)
    .lte('created_at', endTs)
    .in('status', ['rejected', 'flagged'])
  counts.push({ stage: 'Lab Entry', count: lErrors ?? 0 })

  const { count: aErrors } = await supabase
    .from('approvals')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startTs)
    .lte('created_at', endTs)
    .eq('status', 'rejected')
  counts.push({ stage: 'Approval', count: aErrors ?? 0 })

  const total = counts.reduce((s, c) => s + c.count, 0) || 1
  const data: ErrorRateBreakdown[] = counts.map((c) => ({
    stage: c.stage,
    count: c.count,
    percent: Math.round((c.count / total) * 100),
  }))

  return { data }
}

/** Fetch analytics exports list */
export async function fetchExports(limit = 50): Promise<{ data: AnalyticsExport[] }> {
  if (!isSupabaseConfigured()) {
    return { data: [] }
  }

  const { data: rows } = await supabase
    .from('analytics_exports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  const raw = rows ?? []
  const list = Array.isArray(raw) ? raw : []

  const data: AnalyticsExport[] = list.map((r: Record<string, unknown>) => ({
    id: (r.id as string) ?? '',
    type: ((r.type as string) ?? 'csv') as 'pdf' | 'csv',
    format: (r.format as string) ?? 'csv',
    status: ((r.status as string) ?? 'pending') as AnalyticsExport['status'],
    schedule: (r.schedule as string) ?? null,
    lastRun: (r.last_run as string) ?? null,
    fileUrl: (r.file_url as string) ?? null,
    filterSnapshot: (r.filter_snapshot as Record<string, unknown>) ?? null,
    createdAt: (r.created_at as string) ?? '',
  }))

  return { data }
}

/** Request export - creates job, returns jobId; triggers Edge Function to generate file */
export async function requestExport(
  type: 'pdf' | 'csv',
  filters?: AnalyticsFilters
): Promise<{ jobId: string; status: string }> {
  if (!isSupabaseConfigured()) {
    return { jobId: '', status: 'pending' }
  }

  const { data, error } = await supabase
    .from('analytics_exports')
    .insert({
      type,
      format: type,
      status: 'pending',
      filter_snapshot: filters ?? {},
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  const id = (data as { id: string })?.id ?? ''

  try {
    await supabase.functions.invoke('analytics-export', {
      body: { exportId: id },
    })
  } catch {
    // Edge Function may not be deployed; export stays pending
  }

  return { jobId: id, status: 'pending' }
}
