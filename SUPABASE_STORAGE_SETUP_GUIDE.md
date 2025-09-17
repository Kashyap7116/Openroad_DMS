# 🔧 Supabase Storage Setup Guide

## Step 1: Create Storage Bucket (Required)

1. **Login to Supabase Dashboard**: Go to https://supabase.com/dashboard
2. **Navigate to Storage**: Click on "Storage" in the left sidebar
3. **Create New Bucket**: Click "New bucket" button
4. **Configure Bucket**:
   - **Bucket Name**: `employee-files`
   - **Public**: Leave UNCHECKED (private bucket)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: Add these one by one:
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `application/pdf`

## Step 2: Set Storage Policies (Required)

1. **Go to SQL Editor**: Click on "SQL Editor" in left sidebar
2. **Create New Query**: Click "New query"
3. **Run This SQL**: Copy and paste the following SQL and execute:

```sql
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
```

## Step 3: Verify Setup

1. **Run Verification Query**: In SQL Editor, run:

```sql
-- Check if bucket was created
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'employee-files';

-- Check policies were created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

Expected Results:

- Bucket should show: `employee-files`, public=false, size limit=52428800
- Should see 4 policies with names starting with "Allow authenticated"

## Step 4: Test the Integration

### Option A: Use Simple Test (Recommended First)

1. **Test without files**: `POST http://localhost:3001/api/test-employee-simple`
2. **Verify**: Should create employee with ID like `IN-0001`, `TH-0001` based on nationality

### Option B: Use Full Test with Files

1. **Test with files**: `http://localhost:3001/test-employee.html`
2. **Upload files**: Should save to `employees/{id}/{file_type}/` in Supabase Storage

### Option C: Use HR Interface

1. **Go to Dashboard**: Login at `http://localhost:3001/`
2. **Navigate**: HR → Employees → Add Employee
3. **Fill form**: Including nationality and file uploads
4. **Save**: Should generate nationality-based ID and store files

## Expected Results After Setup

✅ **Employee ID Generation**:

- Indian nationality → IN-0001, IN-0002, IN-0003...
- Thai nationality → TH-0001, TH-0002, TH-0003...
- Other nationalities → {CountryCode}-0001, etc.

✅ **File Storage Structure**:

```
Supabase Storage: employee-files bucket
└── employees/
    ├── IN-0001/
    │   ├── photo/
    │   ├── id_proof/
    │   ├── address_proof/
    │   ├── education_cert/
    │   └── professional_cert/
    └── TH-0001/
        ├── photo/
        ├── id_proof/
        ├── address_proof/
        ├── education_cert/
        └── professional_cert/
```

## Troubleshooting

### Error: "Storage bucket not found"

- **Solution**: Complete Step 1 - Create the `employee-files` bucket

### Error: "Row Level Security policy violation"

- **Solution**: Complete Step 2 - Run the storage policies SQL

### Error: "Invalid file format"

- **Solution**: Check allowed MIME types in bucket settings (Step 1)

### Error: "File size too large"

- **Solution**: Increase file size limit in bucket settings or reduce file size

### Error: "Authentication required"

- **Solution**: Login at your application URL with admin credentials you set up in Supabase Auth Dashboard

## Login Information

**Admin Access**: Use the credentials you created in Supabase Auth Dashboard

**Application URLs**:

- Main App: Use your application's URL (development or production)
- API endpoints: Available at `/api/` routes on your domain

## Quick Verification Checklist

- [ ] Supabase storage bucket `employee-files` created
- [ ] Bucket configured as private with 50MB limit
- [ ] MIME types added (jpeg, jpg, png, webp, pdf)
- [ ] RLS policies created (4 policies total)
- [ ] Test employee creation works (generates IN-0001, TH-0001 format)
- [ ] File uploads save to structured folders
- [ ] Can view files in Supabase Storage dashboard

Once all steps are complete, the system will be fully functional with nationality-based employee IDs and secure file storage!
