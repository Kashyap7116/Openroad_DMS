-- =============================================
-- SUPABASE STORAGE BUCKET SETUP
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Create the storage bucket using the Supabase dashboard
-- Go to Storage > Create new bucket
-- Name: employee-files
-- Public: false (private)
-- File size limit: 52428800 (50MB)
-- Allowed MIME types: image/jpeg,image/jpg,image/png,image/gif,application/pdf,image/webp

-- Step 2: After creating the bucket, run these policies:

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated upload employee files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' 
  AND bucket_id = 'employee-files'
  AND (storage.foldername(name))[1] = 'employees'
);

-- Policy: Allow authenticated users to view files  
CREATE POLICY "Allow authenticated view employee files" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'employee-files' 
  AND (storage.foldername(name))[1] = 'employees'
);

-- Policy: Allow authenticated users to update files
CREATE POLICY "Allow authenticated update employee files" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'employee-files'
  AND (storage.foldername(name))[1] = 'employees'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated delete employee files" ON storage.objects  
FOR DELETE USING (
  auth.role() = 'authenticated'
  AND bucket_id = 'employee-files'
  AND (storage.foldername(name))[1] = 'employees'
);

-- Verify setup
SELECT 
    id,
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'employee-files';