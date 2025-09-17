#!/usr/bin/env node

/**
 * Complete Database Audit Script
 * Tests CRUD operations, data integrity, and financial balances
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') })

import { auditService } from '../src/lib/audit-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

async function runCompleteAudit() {
  console.log(colorize('🔍 Starting Complete Database Audit...', 'bold'))
  console.log('='.repeat(60))
  
  try {
    // 1. Test Database Connections
    console.log(colorize('\n1️⃣ Testing Database Connections...', 'blue'))
    const connectionResults = await auditService.testDatabaseConnection()
    
    if (connectionResults.error) {
      console.log(colorize(`❌ Connection failed: ${connectionResults.error}`, 'red'))
      return
    }

    const tables = Object.keys(connectionResults)
    for (const table of tables) {
      const result = connectionResults[table]
      const status = result.connected ? 
        colorize('✅ Connected', 'green') : 
        colorize('❌ Failed', 'red')
      const hasData = result.hasData ? 
        colorize('(has data)', 'cyan') : 
        colorize('(empty)', 'yellow')
      
      console.log(`   ${status} ${table} ${hasData}`)
      
      if (result.error) {
        console.log(colorize(`      Error: ${result.error}`, 'red'))
      }
    }

    // 2. Test CRUD Operations
    console.log(colorize('\n2️⃣ Testing CRUD Operations...', 'blue'))
    const crudResults = await auditService.testCRUDOperations()
    
    const testResults = [
      { name: 'Employee CRUD', result: crudResults.employees },
      { name: 'Vehicle CRUD', result: crudResults.vehicles },
      { name: 'Attendance CRUD', result: crudResults.attendance },
      { name: 'Payroll CRUD', result: crudResults.payroll }
    ]

    for (const test of testResults) {
      const status = test.result.success ? 
        colorize('✅ PASS', 'green') : 
        colorize('❌ FAIL', 'red')
      console.log(`   ${status} ${test.name}`)
      
      if (!test.result.success) {
        console.log(colorize(`      Error: ${test.result.error}`, 'red'))
        
        // Show which operations failed
        const ops = test.result.operations
        console.log(`      Operations: C:${ops.create ? '✓' : '✗'} R:${ops.read ? '✓' : '✗'} U:${ops.update ? '✓' : '✗'} D:${ops.delete ? '✓' : '✗'}`)
      } else {
        console.log(colorize('      All CRUD operations successful', 'cyan'))
      }
    }

    // 3. Run Data Integrity Checks
    console.log(colorize('\n3️⃣ Running Data Integrity Checks...', 'blue'))
    const integrityResults = await auditService.runDataIntegrityChecks()
    
    if (integrityResults.length > 0) {
      integrityResults.forEach(check => {
        const status = check.status === 'PASS' ? 
          colorize('✅', 'green') : 
          check.status === 'WARNING' ? 
          colorize('⚠️', 'yellow') : 
          colorize('❌', 'red')
        
        console.log(`   ${status} ${check.check_name}: ${check.issues_count} issues`)
        
        if (check.issues_count > 0 || check.status !== 'PASS') {
          console.log(colorize(`      ${check.details}`, 'yellow'))
        }
      })
    } else {
      console.log(colorize('   ❌ Unable to run integrity checks - functions may not be available', 'red'))
    }

    // 4. Verify Financial Balances
    console.log(colorize('\n4️⃣ Verifying Financial Balances...', 'blue'))
    const balanceResults = await auditService.verifyFinancialBalances()
    
    if (balanceResults.length > 0) {
      balanceResults.forEach(balance => {
        const status = balance.status === 'BALANCED' ? 
          colorize('✅', 'green') : 
          balance.status === 'UNBALANCED' ? 
          colorize('❌', 'red') : 
          colorize('ℹ️', 'cyan')
        
        console.log(`   ${status} ${balance.balance_type}:`)
        console.log(`      Expected: $${(balance.expected_amount || 0).toFixed(2)}`)
        console.log(`      Actual: $${(balance.actual_amount || 0).toFixed(2)}`)
        console.log(`      Difference: $${(balance.difference || 0).toFixed(2)}`)
      })
    } else {
      console.log(colorize('   ❌ Unable to verify balances - functions may not be available', 'red'))
    }

    // 5. Test Audit Logging
    console.log(colorize('\n5️⃣ Testing Audit Logging...', 'blue'))
    try {
      const logResult = await auditService.logAction({
        tableName: 'test_table',
        recordId: 'test-id-' + Date.now(),
        actionType: 'INSERT',
        newData: { test: 'data', timestamp: Date.now() },
        userId: 'audit-test-user',
        userEmail: 'test@audit.com',
      })
      
      if (logResult.success) {
        console.log(colorize('   ✅ Audit logging: Working correctly', 'green'))
      } else {
        console.log(colorize(`   ❌ Audit logging failed: ${logResult.error?.message}`, 'red'))
      }
    } catch (error) {
      console.log(colorize(`   ❌ Audit logging failed: ${error.message}`, 'red'))
    }

    // 6. Generate Summary Report
    console.log(colorize('\n6️⃣ Generating Audit Summary...', 'blue'))
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString()
    
    const report = await auditService.generateAuditReport(yesterday, today)

    if (report) {
      console.log(`   📊 Audit actions in last 24h: ${colorize(report.summary.total_actions.toString(), 'cyan')}`)
      console.log(`   🔍 Integrity checks run: ${colorize(report.summary.integrity_checks.toString(), 'cyan')}`)
      console.log(`   ⚖️ Balance verifications: ${colorize(report.summary.balance_verifications.toString(), 'cyan')}`)
    } else {
      console.log(colorize('   ❌ Unable to generate audit report', 'red'))
    }

    // 7. Final Summary
    console.log('\n' + '='.repeat(60))
    console.log(colorize('📋 AUDIT SUMMARY', 'bold'))
    console.log('='.repeat(60))
    
    // Calculate overall status
    const allConnectionsWork = Object.values(connectionResults).every((r: any) => r.connected)
    const allCrudPassed = Object.values(crudResults).every((r: any) => r.success)
    const integrityPassed = integrityResults.length === 0 || integrityResults.every(r => r.status === 'PASS')
    const balancesPassed = balanceResults.length === 0 || balanceResults.every(r => r.status !== 'UNBALANCED')
    
    console.log(`Database Connections: ${allConnectionsWork ? colorize('✅ ALL CONNECTED', 'green') : colorize('❌ ISSUES FOUND', 'red')}`)
    console.log(`CRUD Operations: ${allCrudPassed ? colorize('✅ ALL PASS', 'green') : colorize('❌ ISSUES FOUND', 'red')}`)
    console.log(`Data Integrity: ${integrityPassed ? colorize('✅ ALL PASS', 'green') : colorize('❌ ISSUES FOUND', 'red')}`)
    console.log(`Balance Checks: ${balancesPassed ? colorize('✅ BALANCED', 'green') : colorize('❌ UNBALANCED', 'red')}`)
    
    const overallStatus = allConnectionsWork && allCrudPassed && integrityPassed && balancesPassed
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus ? colorize('✅ SYSTEM HEALTHY', 'green') : colorize('❌ ATTENTION REQUIRED', 'red')}`)

    // 8. Recommendations
    if (!overallStatus) {
      console.log(colorize('\n💡 RECOMMENDATIONS:', 'yellow'))
      
      if (!allConnectionsWork) {
        console.log('   • Check database connection and table creation')
        console.log('   • Run the schema migration script in Supabase')
      }
      
      if (!allCrudPassed) {
        console.log('   • Verify table permissions and RLS policies')
        console.log('   • Check foreign key constraints and relationships')
      }
      
      if (!integrityPassed) {
        console.log('   • Review and fix data inconsistencies')
        console.log('   • Implement data validation rules')
      }
      
      if (!balancesPassed) {
        console.log('   • Investigate financial calculation errors')
        console.log('   • Verify accounting procedures and formulas')
      }
    }

    console.log(colorize('\n🏁 Audit completed!', 'bold'))
    process.exit(overallStatus ? 0 : 1)

  } catch (error) {
    console.error(colorize('\n❌ Audit failed with error:', 'red'), error)
    console.error(colorize('Stack trace:', 'red'), error.stack)
    process.exit(1)
  }
}

// Check if we have the required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(colorize('❌ Missing required environment variables:', 'red'))
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env.local file.')
  process.exit(1)
}

// Run the audit
runCompleteAudit().catch((error) => {
  console.error(colorize('Fatal audit error:', 'red'), error)
  process.exit(1)
})