/**
 * Analytics & Reporting types for AquaTrace BI layer
 * KPIs, SLA alerts, exports, trends
 */

export interface KPISummary {
  avgTurnaroundTimeHours: number
  onTimeDeliveries: number
  totalOnTime: number
  testVolumeByType: Record<string, number>
  totalTestVolume: number
  revenueYtd: number
  arAging: number
  slaCompliancePercent: number
  totalSamples: number
  totalReports: number
}

export interface KPIAggregate {
  date: string
  customerId?: string | null
  labId?: string | null
  testVolume: number
  totalRevenue: number
  avgTurnaroundTime: number
  errorRate: number
  slaCompliance: number
}

export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

export type TrendMetric =
  | 'turnaround'
  | 'revenue'
  | 'testVolume'
  | 'errorRate'
  | 'slaCompliance'

export type Granularity = 'day' | 'week' | 'month'

export interface SLAAlert {
  id: string
  customerId: string | null
  customerName?: string
  workflowStage: string
  breachTime: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved'
  resolvedAt: string | null
  notes: string | null
  affectedOrderIds?: string[]
  createdAt: string
}

export interface AnalyticsExport {
  id: string
  type: 'pdf' | 'csv'
  format: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  schedule: string | null
  lastRun: string | null
  fileUrl: string | null
  filterSnapshot: Record<string, unknown> | null
  createdAt: string
}

export interface ExportSchedulePayload {
  type: 'pdf' | 'csv'
  schedule: 'daily' | 'weekly' | 'monthly'
  filters?: AnalyticsFilters
}

export interface AnalyticsFilters {
  startDate?: string
  endDate?: string
  customerId?: string
  labId?: string
  technicianId?: string
  testType?: string
}

export interface ErrorRateBreakdown {
  stage: string
  count: number
  percent: number
}

export interface SLAComplianceByCustomer {
  customerId: string
  customerName: string
  compliance: number
  total: number
  onTime: number
}
