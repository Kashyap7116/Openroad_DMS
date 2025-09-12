import { signInWithPassword } from '@/lib/supabase-auth-actions'

async function testLogin() {
  console.log('Testing login with service role approach...')
  
  try {
    const result = await signInWithPassword('admin@openroad.com', 'admin123')
    
    if (result.success) {
      console.log('✅ Login successful!')
      console.log('User profile:', result.user)
    } else {
      console.log('❌ Login failed:', result.error)
    }
  } catch (error) {
    console.log('❌ Login error:', error)
  }
}

testLogin()
