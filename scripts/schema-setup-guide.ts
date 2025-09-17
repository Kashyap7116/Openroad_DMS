/**
 * Simple Database Schema Setup
 * This will show you exactly what to run in Supabase SQL Editor
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

async function showSchemaInstructions() {
  console.log("🗄️  DATABASE SCHEMA SETUP INSTRUCTIONS");
  console.log("=======================================\n");

  console.log(
    "The dashboard error occurs because the database tables don't exist yet."
  );
  console.log("You need to create them in your Supabase project.\n");

  console.log("📋 STEPS TO FIX:");
  console.log(
    "1. Go to https://zdswsrmyrnixofacoocm.supabase.co (your Supabase dashboard)"
  );
  console.log('2. Click on "SQL Editor" in the left sidebar');
  console.log('3. Click "New Query"');
  console.log("4. Copy and paste the following SQL schema:\n");

  try {
    const schemaPath = join(process.cwd(), "database", "01-schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    // Show first part of schema
    const lines = schema.split("\n");
    const firstPart = lines.slice(0, 30).join("\n");

    console.log("=".repeat(70));
    console.log("SQL TO COPY (First 30 lines):");
    console.log("=".repeat(70));
    console.log(firstPart);
    console.log("...");
    console.log("=".repeat(70));

    console.log("\n💡 FULL SCHEMA LOCATION:");
    console.log(`   File: database/01-schema.sql`);
    console.log(`   Total lines: ${lines.length}`);

    console.log("\n🚀 AFTER RUNNING THE SCHEMA:");
    console.log("1. Run: npm run dev");
    console.log("2. Visit: http://localhost:3000/dashboard");
    console.log('3. The "Internal Server Error" should be resolved');

    console.log("\n📊 EXPECTED TABLES TO BE CREATED:");
    const tableMatches = schema.match(/CREATE TABLE[^(]*\([\s\S]*?\);/g);
    if (tableMatches) {
      tableMatches.slice(0, 10).forEach((table, i) => {
        const tableName = table.match(/CREATE TABLE[^(]*?([a-zA-Z_]+)/)?.[1];
        if (tableName) {
          console.log(`   ${i + 1}. ${tableName}`);
        }
      });
      if (tableMatches.length > 10) {
        console.log(`   ... and ${tableMatches.length - 10} more tables`);
      }
    }
  } catch (error: any) {
    console.error("❌ Error reading schema file:", error.message);
  }
}

// Also create a simple test script
async function createTestTable() {
  console.log("\n🧪 QUICK TEST - Creating a simple table first:");
  console.log("=".repeat(50));
  console.log("-- Copy this to Supabase SQL Editor to test:");
  console.log(`
CREATE TABLE IF NOT EXISTS public.test_connection (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.test_connection (name) VALUES ('Database Connected!');

SELECT * FROM public.test_connection;
  `);
  console.log("=".repeat(50));

  console.log(
    "\n✅ If this works, then run the full schema from database/01-schema.sql"
  );
}

if (require.main === module) {
  showSchemaInstructions();
  createTestTable();
}
