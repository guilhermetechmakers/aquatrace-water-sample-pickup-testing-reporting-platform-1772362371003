/**
 * PDF Report Generation & Distribution - Type definitions
 */

export type ReportStatus = 'draft' | 'approved' | 'distributed'

export interface PickupData {
  technicianName?: string | null
  pickupTime?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
  location?: string | null
  vialIds?: string[] | null
  deviceId?: string | null
  pH?: number | null
  chlorine?: number | null
}

export interface LabResults {
  spcResult?: number | string | null
  spcUnit?: string | null
  spcReference?: string | null
  totalColiformResult?: number | string | null
  totalColiformUnit?: string | null
  totalColiformReference?: string | null
  testedAt?: string | null
  testedBy?: string | null
}

export interface ReportAttachment {
  id: string
  filename: string
  fileType: string
  url?: string
  storagePath?: string
  size?: number
  hash?: string
  embedded?: boolean
}

export interface ReportSignature {
  id: string
  signerRole: string
  signerName: string
  signatureImageUrl?: string | null
  signedAt: string
  certificateInfo?: string | null
}

export interface ReportAuditEntry {
  id: string
  action: 'created' | 'updated' | 'approved' | 'reissued' | 'emailed'
  performedBy?: string | null
  performedAt: string
  note?: string | null
}

export interface ReportVersion {
  id: string
  reportId: string
  version: number
  status: ReportStatus
  pdfUrl?: string | null
  pdfStoragePath?: string | null
  pdfHash?: string | null
  generatedAt?: string | null
  generatedBy?: string | null
  createdAt: string
  createdBy?: string | null
}

export interface Report {
  id: string
  reportId: string
  approvalId: string | null
  customerId: string
  resultId?: string | null
  pickupId?: string | null
  currentVersion: number
  status: ReportStatus
  createdAt: string
  createdBy?: string | null
  updatedAt?: string | null
  customerName?: string | null
  versions?: ReportVersion[]
  pickupData?: PickupData | null
  labResults?: LabResults | null
  attachments?: ReportAttachment[]
  signature?: ReportSignature | null
  auditTrail?: ReportAuditEntry[]
}

export interface GenerateReportPayload {
  reportId?: string
  approvalId: string
  customerId: string
  version?: number
  pickupData: PickupData
  labResults: LabResults
  attachments?: ReportAttachment[]
  signature?: ReportSignature | null
  auditMetadata?: {
    created_at?: string
    generated_by?: string
    version?: number
  }
}

export interface ReportEmailLog {
  id: string
  reportId: string
  recipient: string
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed'
  sentAt?: string | null
  response?: Record<string, unknown> | null
  createdAt: string
}
