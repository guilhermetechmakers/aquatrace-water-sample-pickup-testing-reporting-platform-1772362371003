/**
 * Technician GPS Pickup & Offline Capture - Data Models
 * Sample Management Workflow states: Draft, PendingPickup, Submitted, InLab, LabApproved, Archived, Rejected
 * Legacy: Pending (draft), Submitted (sent to server), Synced (confirmed), Rejected
 */

export type SamplePickupStatus =
  | 'Draft'
  | 'PendingPickup'
  | 'Pending'
  | 'Submitted'
  | 'Synced'
  | 'InLab'
  | 'LabApproved'
  | 'Archived'
  | 'Rejected'

export interface Site {
  id: string
  name: string
  address: string | null
  customerId: string | null
  lat: number | null
  lon: number | null
  metadata: Record<string, unknown>
}

export interface SamplePickup {
  id: string
  serverId: string | null
  vialId: string
  sampleId: string | null
  siteId: string | null
  vialCount: number
  pH: number | null
  chlorine: number | null
  chlorineReading: number | null
  volume: number
  timestamp: string
  gpsLat: number | null
  gpsLon: number | null
  gpsAccuracy: number | null
  technicianId: string
  customerSiteNotes: string | null
  pickupLocationName: string | null
  location: string
  photos: SamplePhoto[]
  status: SamplePickupStatus
  synced: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface SamplePhoto {
  id: string
  pickupId: string
  localUri: string
  serverUrl: string | null
  exif: Record<string, unknown> | null
  createdAt: string
  synced: boolean
}

export interface BarcodeScan {
  id: string
  vialId: string
  pickupId: string | null
  scannedAt: string
  technicianId: string
}

export interface AuditTrailEntry {
  id: string
  pickupId: string
  action: string
  byUserId: string
  timestamp: string
  fromState?: string | null
  toState?: string | null
  notes?: string | null
}

export interface StatusHistoryEntry {
  id: string
  pickupId: string
  status: SamplePickupStatus
  timestamp: string
  note: string | null
}

export interface LabResultForSample {
  id: string
  pickupId: string
  spc: number | null
  totalColiform: number | null
  status: 'PendingApproval' | 'Approved' | 'Rejected'
  approvedBy: string | null
  approvedAt: string | null
}

export type CreateSamplePickupInput = Omit<
  SamplePickup,
  'id' | 'createdAt' | 'updatedAt' | 'serverId' | 'synced'
> & {
  serverId?: string | null
  synced?: boolean
}

export type UpdateSamplePickupInput = Partial<
  Pick<
    SamplePickup,
    | 'vialId'
    | 'sampleId'
    | 'siteId'
    | 'vialCount'
    | 'pH'
    | 'chlorine'
    | 'chlorineReading'
    | 'volume'
    | 'timestamp'
    | 'gpsLat'
    | 'gpsLon'
    | 'gpsAccuracy'
    | 'customerSiteNotes'
    | 'pickupLocationName'
    | 'location'
    | 'photos'
    | 'status'
    | 'synced'
    | 'archived'
  >
>
