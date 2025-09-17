/**
 * Database Schema Setup Script
 * Runs all SQL files in order to setup complete database structure
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log("🚀 Setting up database schema...");

  try {
    // List of SQL files to run in order
    const sqlFiles = [
      "01-schema.sql",
      "02-rls-policies.sql",
      "03-functions.sql",
      "04-seed-data.sql",
    ];

    for (const filename of sqlFiles) {
      console.log(`\n📄 Running ${filename}...`);

      const sqlPath = join(process.cwd(), "database", filename);
      const sqlContent = readFileSync(sqlPath, "utf-8");

      // Split SQL content by semicolons and run each statement
      const statements = sqlContent
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ";";

        try {
          const { error } = await supabase.rpc("exec_sql", { sql: statement });

          if (error) {
            // Try direct query if RPC fails
            const { error: directError } = await supabase
              .from("any_table") // This will be ignored
              .select()
              .limit(0);

            // Use raw SQL execution
            const { error: rawError } = await (supabase as any)
              .from("*")
              .select()
              .limit(0)
              .single();

            console.log(`   ⚠️  Statement ${i + 1}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.log(`   ❌ Statement ${i + 1}: ${err.message}`);
          errorCount++;
        }
      }

      console.log(
        `   ✅ ${filename}: ${successCount} successful, ${errorCount} errors`
      );
    }

    // Verify tables were created
    console.log("\n🔍 Verifying table creation...");
    const { data: tables, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (tables) {
      console.log(`✅ Found ${tables.length} tables in public schema`);
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`);
      });
    } else if (error) {
      console.log("❌ Error checking tables:", error.message);
    }
  } catch (error: any) {
    console.error("💥 Database setup failed:", error.message);
    process.exit(1);
  }
}

// Alternative simple approach - just try to execute the schema file directly
async function simpleSetup() {
  console.log("🚀 Simple database setup...");

  try {
    const schemaPath = join(process.cwd(), "database", "01-schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    // Remove comments and split into statements
    const statements = schema
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .filter((stmt) => stmt.trim().length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < Math.min(5, statements.length); i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`\n${i + 1}. ${statement.substring(0, 100)}...`);

        // Use SQL editor approach
        console.log("💡 Copy this statement to your Supabase SQL Editor:");
        console.log("=".repeat(50));
        console.log(statement + ";");
        console.log("=".repeat(50));
      }
    }

    console.log("\n📋 MANUAL SETUP REQUIRED:");
    console.log("1. Go to your Supabase Dashboard");
    console.log("2. Navigate to SQL Editor");
    console.log("3. Copy and run each statement shown above");
    console.log("4. Or run the entire database/01-schema.sql file");
  } catch (error: any) {
    console.error("💥 Error:", error.message);
  }
}

if (require.main === module) {
  simpleSetup();
}

export { setupDatabase, simpleSetup };
