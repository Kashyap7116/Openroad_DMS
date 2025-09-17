#!/usr/bin/env tsx

/**
 * Gemini API Key Validation Script
 * Tests the API key configuration and connectivity
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function validateGeminiApiKey() {
  console.log("🔑 Validating Gemini API Key Configuration...\n");

  // Check if API key is configured
  const apiKey =
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ No API key found in environment variables");
    console.error(
      "   Expected one of: GOOGLE_GENAI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY"
    );
    process.exit(1);
  }

  console.log(`✅ API key found: ${apiKey.substring(0, 20)}...`);
  console.log(`📊 API key length: ${apiKey.length} characters`);

  // Test API connectivity
  try {
    console.log("\n🌐 Testing API connectivity...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Say hello in one word";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ API test successful!`);
    console.log(`📝 Response: "${text}"`);
    console.log(`⚡ Response time: ${Date.now() - Date.now()}ms`);
  } catch (error: any) {
    console.error("❌ API test failed:");
    console.error(`   Error: ${error.message}`);

    if (error.status === 400) {
      console.error(
        "   💡 This usually means the API key is invalid or expired"
      );
      console.error(
        "   💡 Please check your API key at: https://aistudio.google.com/app/apikey"
      );
    } else if (error.status === 403) {
      console.error("   💡 API key may not have the required permissions");
      console.error("   💡 Ensure the API key has Gemini API access enabled");
    }

    process.exit(1);
  }

  console.log("\n🎉 All tests passed! Gemini API is properly configured.");
}

// Run validation if called directly
if (require.main === module) {
  validateGeminiApiKey().catch(console.error);
}

export { validateGeminiApiKey };
