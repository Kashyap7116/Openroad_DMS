/**
 * Script to set up Supabase storage bucket for profile pictures
 * Run this once to initialize the storage configuration
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBucket() {
  console.log('Setting up profile-pictures storage bucket...');

  try {
    // Create the bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('profile-pictures', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB limit
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('Error creating bucket:', bucketError);
      return false;
    }

    console.log('✅ Bucket created or already exists');

    // Set up RLS policy for the bucket
    const { error: policyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'profile-pictures',
      policy_name: 'Users can upload their own profile pictures',
      definition: `(bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1])`
    });

    if (policyError) {
      console.warn('Note: Could not create RLS policy automatically. You may need to set this up manually in the Supabase dashboard.');
      console.warn('Policy error:', policyError);
    }

    console.log('✅ Storage bucket setup completed!');
    console.log('✅ You can now upload profile pictures to the profile-pictures bucket');
    
    return true;
  } catch (error) {
    console.error('Setup failed:', error);
    return false;
  }
}

if (require.main === module) {
  setupStorageBucket()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { setupStorageBucket };