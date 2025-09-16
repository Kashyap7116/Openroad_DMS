require('dotenv').config({ path: '.env.local' });

async function validateIntegration() {
  console.log('🔍 Openroad DMS - Integration Validation\n');
  console.log('This script validates both Supabase and Gemini AI integrations.\n');

  let supabaseWorking = false;
  let geminiWorking = false;
  let authWorking = false;

  // Test 1: Environment Variables
  console.log('1️⃣ Checking Environment Variables...');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_GENAI_API_KEY',
    'GOOGLE_API_KEY'
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.includes('your-') || value.includes('replace-');
  });

  if (missingVars.length > 0) {
    console.log('❌ Missing or placeholder environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Run: node setup-integration.js to configure these variables\n');
  } else {
    console.log('✅ All environment variables are configured\n');
  }

  // Test 2: Supabase Connection
  console.log('2️⃣ Testing Supabase Connection...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
    } else {
      console.log(`✅ Supabase connected (${users.users.length} users found)`);
      supabaseWorking = true;

      // Test profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (profileError) {
        console.log('⚠️  Profiles table not accessible:', profileError.message);
        console.log('   💡 Run the SQL script from database/supabase-schema.sql');
      } else {
        console.log('✅ Profiles table accessible');
      }
    }
  } catch (error) {
    console.log('❌ Supabase test failed:', error.message);
  }

  // Test 3: Admin Authentication
  if (supabaseWorking) {
    console.log('\n3️⃣ Testing Admin Authentication...');
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@openroad.com',
        password: 'vJ16@160181vj'
      });

      if (authError) {
        console.log('❌ Admin authentication failed:', authError.message);
        console.log('   💡 Visit /admin/auth-diagnostics to fix authentication issues');
      } else {
        console.log('✅ Admin authentication successful');
        authWorking = true;

        // Check admin profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (profileError) {
          console.log('⚠️  Admin profile not found:', profileError.message);
        } else {
          console.log(`✅ Admin profile found (Role: ${profile.role})`);
        }
      }
    } catch (error) {
      console.log('❌ Authentication test failed:', error.message);
    }
  }

  // Test 4: Gemini AI Connection
  console.log('\n4️⃣ Testing Gemini AI Connection...');
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent("Say hello in exactly 5 words");
    const response = await result.response;
    const text = response.text();

    console.log('✅ Gemini AI connected successfully');
    console.log(`   Response: ${text.trim()}`);
    geminiWorking = true;

  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('⚠️  Google AI SDK not installed');
      console.log('   💡 Run: npm install @google/generative-ai');
    } else if (error.message.includes('API key not valid')) {
      console.log('❌ Invalid Gemini API key');
      console.log('   💡 Get a valid key from: https://aistudio.google.com/app/apikey');
    } else {
      console.log('❌ Gemini AI test failed:', error.message);
    }
  }

  // Test 5: Genkit Integration
  console.log('\n5️⃣ Testing Genkit Integration...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Check if Genkit CLI is available
    await execAsync('genkit --version');
    console.log('✅ Genkit CLI available');

    // Test genkit flows (this requires the dev server to be running)
    console.log('   💡 To test AI flows, run: npm run genkit:dev');

  } catch (error) {
    console.log('⚠️  Genkit CLI not available globally');
    console.log('   💡 AI flows available through npm run genkit:dev');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION STATUS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Supabase Database:     ${supabaseWorking ? '✅ Working' : '❌ Issues found'}`);
  console.log(`Admin Authentication:  ${authWorking ? '✅ Working' : '❌ Issues found'}`);
  console.log(`Gemini AI:            ${geminiWorking ? '✅ Working' : '❌ Issues found'}`);

  if (supabaseWorking && authWorking && geminiWorking) {
    console.log('\n🎉 ALL INTEGRATIONS WORKING PERFECTLY!');
    console.log('\nYour Openroad DMS is fully configured with:');
    console.log('✅ Supabase Authentication & Database');
    console.log('✅ Gemini AI Integration');
    console.log('✅ Role-Based Access Control');
    console.log('\nYou can now:');
    console.log('1. Start the app: npm run dev');
    console.log('2. Start AI flows: npm run genkit:dev');
    console.log('3. Visit: http://localhost:3000');
  } else {
    console.log('\n⚠️  SOME ISSUES FOUND');
    console.log('\nNext steps:');
    
    if (!supabaseWorking) {
      console.log('• Fix Supabase configuration and run database schema');
    }
    if (!authWorking) {
      console.log('• Visit /admin/auth-diagnostics to fix authentication');
    }
    if (!geminiWorking) {
      console.log('• Configure valid Gemini API key');
    }
    
    console.log('• Run this validation script again after fixes');
  }

  console.log('\n' + '='.repeat(60));
}

validateIntegration().catch(console.error);