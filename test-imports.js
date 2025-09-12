// Simple test to verify imports work
console.log('Testing imports...')

try {
  const { createSupabaseUser } = require('./src/lib/supabase-admin-actions.ts')
  console.log('✅ supabase-admin-actions imported successfully')
  
  const { supabaseService } = require('./src/lib/supabase-service.ts')
  console.log('✅ supabase-service imported successfully')
  
  console.log('🎉 All imports working!')
} catch (error) {
  console.error('❌ Import error:', error.message)
}
