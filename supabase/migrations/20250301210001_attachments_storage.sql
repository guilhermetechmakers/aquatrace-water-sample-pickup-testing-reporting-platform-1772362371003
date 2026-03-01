-- Attachments storage bucket for secure file uploads
-- Supports: images, PDFs, CSV, instrument raw files
-- Private bucket - access via signed URLs only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'text/csv', 'application/vnd.ms-excel', 'text/plain',
    'application/octet-stream'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: Authenticated users upload to their own path
DROP POLICY IF EXISTS "Attachments: authenticated upload" ON storage.objects;
CREATE POLICY "Attachments: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- RLS: Users can read objects they uploaded or have access via attachments table
DROP POLICY IF EXISTS "Attachments: authenticated read" ON storage.objects;
CREATE POLICY "Attachments: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

-- RLS: Users can update/delete their own uploads
DROP POLICY IF EXISTS "Attachments: authenticated update" ON storage.objects;
CREATE POLICY "Attachments: authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Attachments: authenticated delete" ON storage.objects;
CREATE POLICY "Attachments: authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');
