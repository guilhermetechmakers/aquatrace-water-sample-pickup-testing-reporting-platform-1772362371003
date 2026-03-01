import { supabase } from '@/lib/supabase'
import type { CustomerReport } from '@/types/rbac'

const isSupabaseConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const MOCK_REPORTS: (CustomerReport & { report_id?: string; site?: string; date?: string; pdf_link?: string | null })[] = [
  { id: 'r1', customer_id: 'c1', pickup_id: 'p1', lab_result_id: null, pdf_link: null, distributed_at: null, created_at: new Date().toISOString(), report_id: 'RPT-2024-001', site: 'Building A', date: '2024-03-01' },
  { id: 'r2', customer_id: 'c1', pickup_id: 'p2', lab_result_id: null, pdf_link: null, distributed_at: null, created_at: new Date().toISOString(), report_id: 'RPT-2024-002', site: 'Building B', date: '2024-02-28' },
]

export type ReportWithMeta = CustomerReport & { report_id?: string; site?: string; date?: string; pickup?: { location?: string } }

export async function fetchReports(customerId?: string): Promise<ReportWithMeta[]> {
  if (!isSupabaseConfigured()) {
    const list = customerId
      ? MOCK_REPORTS.filter((r) => r.customer_id === customerId)
      : MOCK_REPORTS
    return list
  }
  let q = supabase.from('customer_reports').select('*')
  if (customerId) q = q.eq('customer_id', customerId)
  const { data } = await q
  return (data ?? []) as ReportWithMeta[]
}

export async function fetchReportsForCustomerUser(userId: string): Promise<ReportWithMeta[]> {
  return fetchReports(userId)
}

export async function fetchAllReports(): Promise<ReportWithMeta[]> {
  return fetchReports()
}

export async function generateReportPdf(id: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return `https://example.com/reports/${id}.pdf`
  }
  // Stub: In production, call Edge Function for PDF generation
  return `https://example.com/reports/${id}.pdf`
}

export async function distributeReport(_reportId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  // Stub: In production, call Edge Function for distribution
}
