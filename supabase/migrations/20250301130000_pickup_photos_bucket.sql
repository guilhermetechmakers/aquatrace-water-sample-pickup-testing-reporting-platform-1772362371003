-- Technician GPS Pickup - Storage bucket for pickup photos
-- Creates pickup-photos bucket for photo uploads during sync.
-- Run this migration after supabase db reset, or create the bucket via Dashboard if needed.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pickup-photos',
  'pickup-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: allow authenticated users to upload; public read for serving images
DROP POLICY IF EXISTS "Pickup photos: authenticated upload" ON storage.objects;
CREATE POLICY "Pickup photos: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pickup-photos');

DROP POLICY IF EXISTS "Pickup photos: public read" ON storage.objects;
CREATE POLICY "Pickup photos: public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'pickup-photos');

DROP POLICY IF EXISTS "Pickup photos: authenticated update own" ON storage.objects;
CREATE POLICY "Pickup photos: authenticated update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pickup-photos');

DROP POLICY IF EXISTS "Pickup photos: authenticated delete own" ON storage.objects;
CREATE POLICY "Pickup photos: authenticated delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pickup-photos');
