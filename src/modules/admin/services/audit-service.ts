'use server'

import { config } from 'dotenv'
import path from 'path'

// Load environment variables when running in Node.js
if (typeof window === 'undefined') {
  config({ path: path.join(process.cwd(), '.env.local') })
}

import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/modules/auth/services/supabase-auth-actions'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action_type: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data?: any
  new_data?: any
  changed_fields?: string[]
  user_id?: string
  user_email?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

interface DataIntegrityCheck {
  check_name: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  issues_count: number
  details: string
}

interface BalanceVerification {
  balance_type: string
  expected_amount: number
  actual_amount: number
  difference: number
  status: 'BALANCED' | 'UNBALANCED' | 'INFO'
}

class AuditService {
  private supabase

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  // =============================================================================
  // AUDIT LOGGING
  // =============================================================================

  async logAction(params: {
    tableName: string
    recordId: string
    actionType: 'INSERT' | 'UPDATE' | 'DELETE'
    oldData?: any
    newData?: any
    userId?: string
    userEmail?: string
    ipAddress?: string
    userAgent?: string
  }) {
    try {
      const changedFields = this.getChangedFields(params.oldData, params.newData)

      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          table_name: params.tableName,
          record_id: params.recordId,
          action_type: params.actionType,
          old_data: params.oldData,
          new_data: params.newData,
          changed_fields: changedFields,
          user_id: params.userId,
          user_email: params.userEmail,
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
        })

      if (error) {
        console.error('Failed to log audit action:', error)
      }

      return { success: !error, error }
    } catch (error) {
      console.error('Audit logging error:', error)
      return { success: false, error }
    }
  }

  async getAuditLogs(filters: {
    tableName?: string
    recordId?: string
    actionType?: string
    userId?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}) {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.tableName) query = query.eq('table_name', filters.tableName)
      if (filters.recordId) query = query.eq('record_id', filters.recordId)
      if (filters.actionType) query = query.eq('action_type', filters.actionType)
      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.startDate) query = query.gte('created_at', filters.startDate)
      if (filters.endDate) query = query.lte('created_at', filters.endDate)

      const page = filters.page || 1
      const limit = filters.limit || 50
      query = query.range((page - 1) * limit, page * limit - 1)

      return await query
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return { data: [], error }
    }
  }

  // =============================================================================
  // DATA INTEGRITY CHECKS
  // =============================================================================

  async runDataIntegrityChecks(): Promise<DataIntegrityCheck[]> {
    try {
      // Check if the function exists, if not run manual checks
      const { data, error } = await this.supabase.rpc('check_data_integrity')

      if (error) {
        console.log('RPC function not available, running manual checks...')
        return await this.runManualIntegrityChecks()
      }

      // Log the results
      await this.supabase
        .from('data_integrity_checks')
        .insert({
          check_type: 'comprehensive_check',
          status: data.every((check: DataIntegrityCheck) => check.status === 'PASS') ? 'pass' : 'fail',
          issues_found: data.reduce((sum: number, check: DataIntegrityCheck) => sum + check.issues_count, 0),
          details: data,
        })

      return data
    } catch (error) {
      console.error('Data integrity check error, falling back to manual checks:', error)
      return await this.runManualIntegrityChecks()
    }
  }

  private async runManualIntegrityChecks(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = []

    try {
      // Check 1: Employees without departments
      const { data: employeesWithoutDept, error: e1 } = await this.supabase
        .from('employees')
        .select('employee_id')
        .is('department_id', null)
        .eq('status', 'active')

      if (!e1) {
        checks.push({
          check_name: 'Employees without departments',
          status: (employeesWithoutDept?.length || 0) === 0 ? 'PASS' : 'FAIL',
          issues_count: employeesWithoutDept?.length || 0,
          details: employeesWithoutDept?.length > 0 
            ? `Employees: ${employeesWithoutDept.map(e => e.employee_id).join(', ')}`
            : 'All employees have departments'
        })
      }

      // Check 2: Orphaned payroll records
      const { data: orphanedPayroll, error: e2 } = await this.supabase
        .from('payroll_records')
        .select('id, employee_id')
        .not('employee_id', 'in', '(SELECT id FROM employees)')

      if (!e2) {
        checks.push({
          check_name: 'Orphaned payroll records',
          status: (orphanedPayroll?.length || 0) === 0 ? 'PASS' : 'FAIL',
          issues_count: orphanedPayroll?.length || 0,
          details: orphanedPayroll?.length > 0 
            ? `Records: ${orphanedPayroll.length}`
            : 'No orphaned payroll records'
        })
      }

      // Check 3: Negative salaries
      const { data: negativeSalaries, error: e3 } = await this.supabase
        .from('employees')
        .select('employee_id')
        .lt('salary', 0)

      if (!e3) {
        checks.push({
          check_name: 'Negative salaries',
          status: (negativeSalaries?.length || 0) === 0 ? 'PASS' : 'FAIL',
          issues_count: negativeSalaries?.length || 0,
          details: negativeSalaries?.length > 0 
            ? `Employees: ${negativeSalaries.map(e => e.employee_id).join(', ')}`
            : 'All salaries are positive'
        })
      }

      // Check 4: Invalid vehicle IDs
      const { data: invalidVehicles, error: e4 } = await this.supabase
        .from('vehicles')
        .select('id')
        .or('vehicle_id.is.null,vehicle_id.eq.')

      if (!e4) {
        checks.push({
          check_name: 'Invalid vehicle IDs',
          status: (invalidVehicles?.length || 0) === 0 ? 'PASS' : 'FAIL',
          issues_count: invalidVehicles?.length || 0,
          details: invalidVehicles?.length > 0 
            ? `Vehicles: ${invalidVehicles.length}`
            : 'All vehicle IDs are valid'
        })
      }

      // Check 5: Invalid attendance hours
      const { data: invalidAttendance, error: e5 } = await this.supabase
        .from('attendance_records')
        .select('id')
        .or('hours_worked.lt.0,hours_worked.gt.24,overtime_hours.lt.0,overtime_hours.gt.12')

      if (!e5) {
        checks.push({
          check_name: 'Invalid attendance hours',
          status: (invalidAttendance?.length || 0) === 0 ? 'PASS' : 'FAIL',
          issues_count: invalidAttendance?.length || 0,
          details: invalidAttendance?.length > 0 
            ? `Records: ${invalidAttendance.length}`
            : 'All attendance hours are valid'
        })
      }

    } catch (error) {
      console.error('Manual integrity check error:', error)
      checks.push({
        check_name: 'Manual integrity check',
        status: 'FAIL',
        issues_count: 1,
        details: `Error running checks: ${error.message}`
      })
    }

    return checks
  }

  // =============================================================================
  // BALANCE VERIFICATION
  // =============================================================================

  async verifyFinancialBalances(): Promise<BalanceVerification[]> {
    try {
      // Try to use the RPC function first
      const { data, error } = await this.supabase.rpc('verify_financial_balances')

      if (error) {
        console.log('RPC function not available, running manual balance checks...')
        return await this.runManualBalanceChecks()
      }

      // Log each balance verification
      for (const balance of data) {
        await this.supabase
          .from('balance_verifications')
          .insert({
            verification_type: balance.balance_type,
            expected_value: balance.expected_amount,
            actual_value: balance.actual_amount,
            difference: balance.difference,
            status: balance.status.toLowerCase(),
            details: balance,
          })
      }

      return data
    } catch (error) {
      console.error('Balance verification error, falling back to manual checks:', error)
      return await this.runManualBalanceChecks()
    }
  }

  private async runManualBalanceChecks(): Promise<BalanceVerification[]> {
    const balances: BalanceVerification[] = []

    try {
      // Check payroll balance
      const { data: payrollRecords } = await this.supabase
        .from('payroll_records')
        .select('net_pay, basic_salary, overtime_pay, allowances, deductions, tax')
        .eq('status', 'processed')

      if (payrollRecords) {
        const totalNetPay = payrollRecords.reduce((sum, record) => sum + (record.net_pay || 0), 0)
        const totalCalculated = payrollRecords.reduce((sum, record) => {
          return sum + (
            (record.basic_salary || 0) +
            (record.overtime_pay || 0) +
            (record.allowances || 0) -
            (record.deductions || 0) -
            (record.tax || 0)
          )
        }, 0)

        const difference = Math.abs(totalNetPay - totalCalculated)

        balances.push({
          balance_type: 'Payroll Balance',
          expected_amount: totalNetPay,
          actual_amount: totalCalculated,
          difference,
          status: difference < 0.01 ? 'BALANCED' : 'UNBALANCED'
        })
      }

      // Check vehicle inventory value
      const { data: vehicles } = await this.supabase
        .from('vehicles')
        .select('current_value, purchase_price')
        .in('status', ['available', 'in_use'])

      if (vehicles) {
        const totalCurrentValue = vehicles.reduce((sum, v) => sum + (v.current_value || 0), 0)
        const totalPurchasePrice = vehicles.reduce((sum, v) => sum + (v.purchase_price || 0), 0)

        balances.push({
          balance_type: 'Vehicle Inventory',
          expected_amount: totalCurrentValue,
          actual_amount: totalPurchasePrice,
          difference: totalCurrentValue - totalPurchasePrice,
          status: 'INFO'
        })
      }

      // Check financial adjustments if table exists
      const { data: adjustments } = await this.supabase
        .from('financial_adjustments')
        .select('adjustment_type, amount')
        .eq('status', 'approved')

      if (adjustments) {
        const credits = adjustments
          .filter(a => ['bonus', 'revenue'].includes(a.adjustment_type))
          .reduce((sum, a) => sum + (a.amount || 0), 0)
        
        const debits = adjustments
          .filter(a => ['deduction', 'expense'].includes(a.adjustment_type))
          .reduce((sum, a) => sum + (a.amount || 0), 0)

        balances.push({
          balance_type: 'Adjustments Balance',
          expected_amount: credits,
          actual_amount: debits,
          difference: credits - debits,
          status: 'INFO'
        })
      }

    } catch (error) {
      console.error('Manual balance check error:', error)
      balances.push({
        balance_type: 'Balance Check Error',
        expected_amount: 0,
        actual_amount: 0,
        difference: 0,
        status: 'UNBALANCED'
      })
    }

    return balances
  }

  // =============================================================================
  // CRUD OPERATIONS TESTING
  // =============================================================================

  async testCRUDOperations() {
    const results = {
      employees: await this.testEmployeeCRUD(),
      vehicles: await this.testVehicleCRUD(),
      attendance: await this.testAttendanceCRUD(),
      payroll: await this.testPayrollCRUD(),
    }

    // Log overall CRUD test results
    try {
      await this.supabase
        .from('data_integrity_checks')
        .insert({
          check_type: 'crud_operations_test',
          status: Object.values(results).every(r => r.success) ? 'pass' : 'fail',
          issues_found: Object.values(results).filter(r => !r.success).length,
          details: results,
        })
    } catch (error) {
      console.error('Failed to log CRUD test results:', error)
    }

    return results
  }

  private async testEmployeeCRUD() {
    try {
      // Test CREATE
      const testEmployee = {
        employee_id: `TEST_${Date.now()}`,
        full_name: 'Test Employee',
        email: `test_${Date.now()}@example.com`,
        position: 'Test Position',
        salary: 50000,
        status: 'active',
      }

      const { data: created, error: createError } = await this.supabase
        .from('employees')
        .insert(testEmployee)
        .select()
        .single()

      if (createError) throw createError

      // Test READ
      const { data: read, error: readError } = await this.supabase
        .from('employees')
        .select('*')
        .eq('id', created.id)
        .single()

      if (readError) throw readError

      // Test UPDATE
      const { data: updated, error: updateError } = await this.supabase
        .from('employees')
        .update({ full_name: 'Updated Test Employee' })
        .eq('id', created.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Test DELETE
      const { error: deleteError } = await this.supabase
        .from('employees')
        .delete()
        .eq('id', created.id)

      if (deleteError) throw deleteError

      return {
        success: true,
        operations: {
          create: !!created,
          read: !!read,
          update: updated.full_name === 'Updated Test Employee',
          delete: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      }
    }
  }

  private async testVehicleCRUD() {
    try {
      const testVehicle = {
        vehicle_id: `TEST_V_${Date.now()}`,
        make: 'Test Make',
        model: 'Test Model',
        year: 2023,
        status: 'available',
        purchase_price: 25000,
        current_value: 24000,
      }

      const { data: created, error: createError } = await this.supabase
        .from('vehicles')
        .insert(testVehicle)
        .select()
        .single()

      if (createError) throw createError

      const { data: read, error: readError } = await this.supabase
        .from('vehicles')
        .select('*')
        .eq('id', created.id)
        .single()

      if (readError) throw readError

      const { data: updated, error: updateError } = await this.supabase
        .from('vehicles')
        .update({ current_value: 23000 })
        .eq('id', created.id)
        .select()
        .single()

      if (updateError) throw updateError

      const { error: deleteError } = await this.supabase
        .from('vehicles')
        .delete()
        .eq('id', created.id)

      if (deleteError) throw deleteError

      return {
        success: true,
        operations: {
          create: !!created,
          read: !!read,
          update: updated.current_value === 23000,
          delete: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      }
    }
  }

  private async testAttendanceCRUD() {
    try {
      // First create a test employee
      const { data: employee } = await this.supabase
        .from('employees')
        .insert({
          employee_id: `TEST_EMP_${Date.now()}`,
          full_name: 'Test Employee for Attendance',
          email: `test_att_${Date.now()}@example.com`,
        })
        .select()
        .single()

      const testAttendance = {
        employee_id: employee.id,
        date: new Date().toISOString().split('T')[0],
        check_in: '09:00:00',
        check_out: '17:00:00',
        hours_worked: 8,
        status: 'present',
      }

      const { data: created, error: createError } = await this.supabase
        .from('attendance_records')
        .insert(testAttendance)
        .select()
        .single()

      if (createError) throw createError

      const { data: read, error: readError } = await this.supabase
        .from('attendance_records')
        .select('*')
        .eq('id', created.id)
        .single()

      if (readError) throw readError

      const { data: updated, error: updateError } = await this.supabase
        .from('attendance_records')
        .update({ hours_worked: 8.5 })
        .eq('id', created.id)
        .select()
        .single()

      if (updateError) throw updateError

      const { error: deleteError } = await this.supabase
        .from('attendance_records')
        .delete()
        .eq('id', created.id)

      if (deleteError) throw deleteError

      // Clean up test employee
      await this.supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      return {
        success: true,
        operations: {
          create: !!created,
          read: !!read,
          update: updated.hours_worked === 8.5,
          delete: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      }
    }
  }

  private async testPayrollCRUD() {
    try {
      // First create a test employee
      const { data: employee } = await this.supabase
        .from('employees')
        .insert({
          employee_id: `TEST_EMP_PAY_${Date.now()}`,
          full_name: 'Test Employee for Payroll',
          email: `test_pay_${Date.now()}@example.com`,
          salary: 50000,
        })
        .select()
        .single()

      const testPayroll = {
        employee_id: employee.id,
        pay_period_start: '2023-01-01',
        pay_period_end: '2023-01-31',
        basic_salary: 4166.67,
        overtime_pay: 0,
        allowances: 500,
        deductions: 200,
        tax: 800,
        net_pay: 3666.67,
        status: 'processed',
      }

      const { data: created, error: createError } = await this.supabase
        .from('payroll_records')
        .insert(testPayroll)
        .select()
        .single()

      if (createError) throw createError

      const { data: read, error: readError } = await this.supabase
        .from('payroll_records')
        .select('*')
        .eq('id', created.id)
        .single()

      if (readError) throw readError

      const { data: updated, error: updateError } = await this.supabase
        .from('payroll_records')
        .update({ overtime_pay: 300, net_pay: 3966.67 })
        .eq('id', created.id)
        .select()
        .single()

      if (updateError) throw updateError

      const { error: deleteError } = await this.supabase
        .from('payroll_records')
        .delete()
        .eq('id', created.id)

      if (deleteError) throw deleteError

      // Clean up test employee
      await this.supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      return {
        success: true,
        operations: {
          create: !!created,
          read: !!read,
          update: updated.overtime_pay === 300,
          delete: true,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        operations: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      }
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private getChangedFields(oldData: any, newData: any): string[] {
    if (!oldData || !newData) return []

    const changes: string[] = []
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

    for (const key of allKeys) {
      if (oldData[key] !== newData[key]) {
        changes.push(key)
      }
    }

    return changes
  }

  async generateAuditReport(startDate: string, endDate: string) {
    try {
      const { data: auditLogs } = await this.getAuditLogs({
        startDate,
        endDate,
        limit: 1000,
      })

      const { data: integrityChecks } = await this.supabase
        .from('data_integrity_checks')
        .select('*')
        .gte('checked_at', startDate)
        .lte('checked_at', endDate)

      const { data: balanceVerifications } = await this.supabase
        .from('balance_verifications')
        .select('*')
        .gte('verified_at', startDate)
        .lte('verified_at', endDate)

      return {
        period: { start: startDate, end: endDate },
        summary: {
          total_actions: auditLogs?.length || 0,
          integrity_checks: integrityChecks?.length || 0,
          balance_verifications: balanceVerifications?.length || 0,
        },
        audit_logs: auditLogs,
        integrity_checks: integrityChecks,
        balance_verifications: balanceVerifications,
        generated_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to generate audit report:', error)
      return null
    }
  }

  // =============================================================================
  // DATABASE CONNECTION TEST
  // =============================================================================

  async testDatabaseConnection() {
    try {
      const tables = ['employees', 'vehicles', 'attendance_records', 'payroll_records', 'audit_logs']
      const results = {}

      for (const table of tables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('id')
            .limit(1)

          results[table] = {
            connected: !error,
            error: error?.message || null,
            hasData: (data?.length || 0) > 0
          }
        } catch (error) {
          results[table] = {
            connected: false,
            error: error.message,
            hasData: false
          }
        }
      }

      return results
    } catch (error) {
      console.error('Database connection test failed:', error)
      return { error: error.message }
    }
  }
}

export const auditService = new AuditService()

// Export server actions for use in components
export async function runCompleteAudit() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const results = {
      connection: await auditService.testDatabaseConnection(),
      crud: await auditService.testCRUDOperations(),
      integrity: await auditService.runDataIntegrityChecks(),
      balance: await auditService.verifyFinancialBalances(),
    }

    return { success: true, results }
  } catch (error) {
    console.error('Complete audit failed:', error)
    return { success: false, error: error.message }
  }
}

export async function getAuditReport(startDate: string, endDate: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const report = await auditService.generateAuditReport(startDate, endDate)
    return { success: true, data: report }
  } catch (error) {
    console.error('Failed to generate audit report:', error)
    return { success: false, error: error.message }
  }
}
