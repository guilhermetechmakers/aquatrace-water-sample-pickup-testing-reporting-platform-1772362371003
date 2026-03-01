/**
 * Technician GPS Pickup & Offline Capture - Data Models
 * Status: Pending (draft), Submitted (sent to server), Synced (confirmed), Rejected
 */

export type SamplePickupStatus = 'Pending' | 'Submitted' | 'Synced' | 'Rejected'

export interface SamplePickup {
  id: string
  serverId: string | null
  vialId: string
  pH: number | null
  chlorine: number | null
  volume: number
  timestamp: string
  gpsLat: number | null
  gpsLon: number | null
  gpsAccuracy: number | null
  technicianId: string
  customerSiteNotes: string | null
  location: string
  photos: SamplePhoto[]
  status: SamplePickupStatus
  synced: boolean
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
    | 'pH'
    | 'chlorine'
    | 'volume'
    | 'timestamp'
    | 'gpsLat'
    | 'gpsLon'
    | 'gpsAccuracy'
    | 'customerSiteNotes'
    | 'location'
    | 'photos'
    | 'status'
    | 'synced'
  >
>
