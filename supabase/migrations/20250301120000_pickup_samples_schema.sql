-- Technician GPS Pickup & Offline Capture - Extended pickups schema
-- Adds vial_id, gps_accuracy, volume, timestamp, customer_site_notes for sample capture flow

-- Add new columns to pickups (nullable for backward compatibility)
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS vial_id TEXT;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS volume INTEGER DEFAULT 100;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS sample_timestamp TIMESTAMPTZ;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS customer_site_notes TEXT;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT true;

-- Extend status check to include sample flow statuses
ALTER TABLE public.pickups DROP CONSTRAINT IF EXISTS pickups_status_check;
ALTER TABLE public.pickups ADD CONSTRAINT pickups_status_check CHECK (
  status IN ('scheduled', 'in_progress', 'completed', 'pending', 'submitted', 'synced', 'rejected')
);

-- Index for technician sample lookups
CREATE INDEX IF NOT EXISTS idx_pickups_vial_id ON public.pickups(vial_id);
CREATE INDEX IF NOT EXISTS idx_pickups_technician_status ON public.pickups(technician_id, status);
