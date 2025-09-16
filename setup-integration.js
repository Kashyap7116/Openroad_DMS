#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupIntegration() {
  console.log('🚀 Openroad DMS - Supabase & Gemini AI Integration Setup\n');
  console.log('This script will help you configure both Supabase and Gemini AI integration.\n');

  // Check if .env.local exists
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ Found existing .env.local file\n');
  } else {
    console.log('📝 Creating new .env.local file\n');
  }

  console.log('='.repeat(60));
  console.log('🗄️  SUPABASE CONFIGURATION');
  console.log('='.repeat(60));
  console.log('1. Go to https://supabase.com and create a new project');
  console.log('2. In your project dashboard, go to Settings → API');
  console.log('3. Copy the required values below:\n');

  const supabaseUrl = await askQuestion('Enter your Supabase Project URL: ');
  const supabaseAnonKey = await askQuestion('Enter your Supabase Anon Key: ');
  const supabaseServiceKey = await askQuestion('Enter your Supabase Service Role Key: ');

  console.log('\n' + '='.repeat(60));
  console.log('🤖 GEMINI AI CONFIGURATION');
  console.log('='.repeat(60));
  console.log('1. Go to https://aistudio.google.com/app/apikey');
  console.log('2. Create a new API key');
  console.log('3. Copy the API key below:\n');

  const geminiApiKey = await askQuestion('Enter your Google Gemini API Key: ');

  // Create or update .env.local
  const newEnvContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Gemini AI Configuration
GOOGLE_GENAI_API_KEY=${geminiApiKey}
GOOGLE_API_KEY=${geminiApiKey}

# Next.js Configuration
NODE_ENV=development
`;

  fs.writeFileSync(envPath, newEnvContent);
  console.log('\n✅ Environment variables saved to .env.local\n');

  console.log('='.repeat(60));
  console.log('🗄️  DATABASE SETUP');
  console.log('='.repeat(60));
  console.log('Next steps to complete the setup:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the SQL script from: database/supabase-schema.sql');
  console.log('4. This will create the profiles table and RLS policies\n');

  console.log('='.repeat(60));
  console.log('🧪 TESTING SETUP');
  console.log('='.repeat(60));
  console.log('Run these commands to test your setup:');
  console.log('1. npm run dev                    # Start the development server');
  console.log('2. npm run genkit:dev            # Start the AI development server');
  console.log('3. Visit: http://localhost:3000  # Test the application');
  console.log('4. Visit: /admin/auth-diagnostics # Run authentication diagnostics\n');

  console.log('='.repeat(60));
  console.log('🎉 SETUP COMPLETED!');
  console.log('='.repeat(60));
  console.log('Your Openroad DMS is now configured with:');
  console.log('✅ Supabase Authentication & Database');
  console.log('✅ Gemini AI Integration');
  console.log('✅ Role-Based Access Control (RBAC)');
  console.log('✅ Secure Environment Configuration\n');

  rl.close();
}

setupIntegration().catch(console.error);