/**
 * Updated HR Actions using Optimized Database Service
 * High-performance database operations with caching
 */

'use server'

import { dataService } from '@/lib/optimized-data-service'
import { getCurrentUser } from '@/modules/auth/services/supabase-auth-actions'
import type { Employee, AttendanceRecord, PayrollRecord, Department } from '@/lib/optimized-data-service'

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

export async function getEmployees(options: {
  page?: number
  limit?: number
  departmentId?: string
  status?: string
  search?: string
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getEmployees({
      ...options,
      includeDepartment: true
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return { data: [], error, count: 0 }
  }
}

export async function getEmployeeById(id: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const employee = await dataService.getEmployeeById(id, true)
    return { data: employee, error: null }
  } catch (error) {
    console.error('Error fetching employee:', error)
    return { data: null, error }
  }
}

export async function createEmployee(employeeData: Partial<Employee>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate required fields
    if (!employeeData.full_name || !employeeData.employee_id) {
      return { success: false, error: 'Full name and employee ID are required' }
    }

    // Check for duplicate employee ID
    const existingEmployees = await dataService.getEmployees({
      search: employeeData.employee_id,
      limit: 1
    })
    
    if (existingEmployees.data?.some((emp: Employee) => emp.employee_id === employeeData.employee_id)) {
      return { success: false, error: 'Employee ID already exists' }
    }

    const result = await dataService.createEmployee({
      ...employeeData,
      status: employeeData.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating employee:', error)
    return { success: false, error: 'Failed to create employee' }
  }
}

export async function updateEmployee(id: string, updates: Partial<Employee>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    // If updating employee_id, check for duplicates
    if (updates.employee_id) {
      const existingEmployees = await dataService.getEmployees({
        search: updates.employee_id,
        limit: 10
      })
      
      if (existingEmployees.data?.some((emp: Employee) => 
        emp.employee_id === updates.employee_id && emp.id !== id
      )) {
        return { success: false, error: 'Employee ID already exists' }
      }
    }

    const result = await dataService.updateEmployee(id, {
      ...updates,
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error updating employee:', error)
    return { success: false, error: 'Failed to update employee' }
  }
}

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

export async function getAttendanceRecords(options: {
  employeeId?: string
  startDate?: string
  endDate?: string
  status?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getAttendanceRecords({
      ...options,
      includeEmployee: true
    })
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return { data: [], error, count: 0 }
  }
}

export async function createAttendanceRecord(attendanceData: Partial<AttendanceRecord>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate required fields
    if (!attendanceData.employee_id || !attendanceData.date) {
      return { success: false, error: 'Employee ID and date are required' }
    }

    // Check if attendance record already exists for this date
    const existingRecords = await dataService.getAttendanceRecords({
      employeeId: attendanceData.employee_id,
      startDate: attendanceData.date,
      endDate: attendanceData.date,
      limit: 1
    })

    if (existingRecords.data && existingRecords.data.length > 0) {
      return { success: false, error: 'Attendance record already exists for this date' }
    }

    // Calculate hours worked if check_in and check_out are provided
    let calculatedData = { ...attendanceData }
    if (attendanceData.check_in && attendanceData.check_out) {
      const checkIn = new Date(`${attendanceData.date}T${attendanceData.check_in}`)
      const checkOut = new Date(`${attendanceData.date}T${attendanceData.check_out}`)
      const breakTime = attendanceData.break_start && attendanceData.break_end 
        ? (new Date(`${attendanceData.date}T${attendanceData.break_end}`).getTime() - 
           new Date(`${attendanceData.date}T${attendanceData.break_start}`).getTime()) / (1000 * 60 * 60)
        : 0

      const totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) - breakTime
      const regularHours = Math.min(totalHours, 8)
      const overtimeHours = Math.max(totalHours - 8, 0)

      calculatedData = {
        ...calculatedData,
        hours_worked: Math.round(regularHours * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
        status: totalHours >= 8 ? 'full_day' : totalHours >= 4 ? 'half_day' : 'partial'
      }
    }

    const result = await dataService.createAttendanceRecord(calculatedData)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating attendance record:', error)
    return { success: false, error: 'Failed to create attendance record' }
  }
}

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    // Recalculate hours if times are updated
    let calculatedUpdates = { ...updates }
    if (updates.check_in || updates.check_out) {
      // Need to get the existing record to get the date
      const existingRecord = await dataService.getAttendanceRecords({
        page: 1,
        limit: 1
      })
      
      if (existingRecord.data && existingRecord.data.length > 0) {
        const record = existingRecord.data[0] as AttendanceRecord
        const date = updates.date || record.date
        const checkIn = updates.check_in || record.check_in
        const checkOut = updates.check_out || record.check_out

        if (checkIn && checkOut) {
          const checkInTime = new Date(`${date}T${checkIn}`)
          const checkOutTime = new Date(`${date}T${checkOut}`)
          const breakTime = (updates.break_start || record.break_start) && (updates.break_end || record.break_end)
            ? (new Date(`${date}T${updates.break_end || record.break_end}`).getTime() - 
               new Date(`${date}T${updates.break_start || record.break_start}`).getTime()) / (1000 * 60 * 60)
            : 0

          const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) - breakTime
          const regularHours = Math.min(totalHours, 8)
          const overtimeHours = Math.max(totalHours - 8, 0)

          calculatedUpdates = {
            ...calculatedUpdates,
            hours_worked: Math.round(regularHours * 100) / 100,
            overtime_hours: Math.round(overtimeHours * 100) / 100,
            status: totalHours >= 8 ? 'full_day' : totalHours >= 4 ? 'half_day' : 'partial'
          }
        }
      }
    }

    const result = await dataService.updateAttendanceRecord(id, calculatedUpdates)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error updating attendance record:', error)
    return { success: false, error: 'Failed to update attendance record' }
  }
}

// ============================================================================
// PAYROLL MANAGEMENT
// ============================================================================

export async function getPayrollRecords(options: {
  employeeId?: string
  startDate?: string
  endDate?: string
  status?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getPayrollRecords({
      ...options,
      includeEmployee: true
    })
  } catch (error) {
    console.error('Error fetching payroll records:', error)
    return { data: [], error, count: 0 }
  }
}

export async function generatePayroll(employeeId: string, payPeriodStart: string, payPeriodEnd: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get employee details
    const employee = await dataService.getEmployeeById(employeeId)
    if (!employee) {
      return { success: false, error: 'Employee not found' }
    }

    // Get attendance records for the pay period
    const attendanceRecords = await dataService.getAttendanceRecords({
      employeeId,
      startDate: payPeriodStart,
      endDate: payPeriodEnd,
      limit: 1000
    })

    if (!attendanceRecords.data) {
      return { success: false, error: 'No attendance records found for this period' }
    }

    // Calculate pay components
    const totalHours = attendanceRecords.data.reduce((sum: number, record: AttendanceRecord) => 
      sum + (record.hours_worked || 0), 0)
    const totalOvertimeHours = attendanceRecords.data.reduce((sum: number, record: AttendanceRecord) => 
      sum + (record.overtime_hours || 0), 0)

    const basicSalary = employee.salary || 0
    const hourlyRate = basicSalary / (30 * 8) // Assuming 30 days, 8 hours per day
    const overtimeRate = hourlyRate * 1.5

    const basicPay = totalHours * hourlyRate
    const overtimePay = totalOvertimeHours * overtimeRate
    const grossPay = basicPay + overtimePay

    // Apply basic tax calculation (simplified)
    const taxRate = grossPay > 5000 ? 0.15 : grossPay > 3000 ? 0.10 : 0.05
    const taxDeduction = grossPay * taxRate
    const netPay = grossPay - taxDeduction

    const payrollData = {
      employee_id: employeeId,
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      basic_salary: Math.round(basicPay * 100) / 100,
      overtime_pay: Math.round(overtimePay * 100) / 100,
      bonuses: 0,
      deductions: 0,
      gross_pay: Math.round(grossPay * 100) / 100,
      tax_deduction: Math.round(taxDeduction * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      payment_status: 'pending',
      payment_method: 'bank_transfer'
    }

    const result = await dataService.createPayrollRecord(payrollData)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error generating payroll:', error)
    return { success: false, error: 'Failed to generate payroll' }
  }
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

export async function getDepartments() {
  try {
    return await dataService.getDepartments()
  } catch (error) {
    console.error('Error fetching departments:', error)
    return { data: [], error }
  }
}

export async function getCountries() {
  try {
    return await dataService.getCountries()
  } catch (error) {
    console.error('Error fetching countries:', error)
    return { data: [], error }
  }
}

export async function getHolidays(year?: number) {
  try {
    return await dataService.getHolidays(year)
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return { data: [], error }
  }
}

// ============================================================================
// ANALYTICS AND REPORTING
// ============================================================================

export async function getEmployeeStats() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const stats = await dataService.getEmployeeStats()
    return { data: stats, error: null }
  } catch (error) {
    console.error('Error fetching employee stats:', error)
    return { data: null, error }
  }
}

export async function getAttendanceSummary(employeeId?: string, month?: string, year?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const currentDate = new Date()
    const targetYear = year ? parseInt(year) : currentDate.getFullYear()
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth()

    const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0]

    const records = await dataService.getAttendanceRecords({
      employeeId,
      startDate,
      endDate,
      limit: 1000
    })

    if (!records.data) {
      return { data: null, error: records.error }
    }

    const summary = {
      totalDays: records.data.length,
      presentDays: records.data.filter((r: AttendanceRecord) => r.status !== 'absent').length,
      absentDays: records.data.filter((r: AttendanceRecord) => r.status === 'absent').length,
      totalHours: records.data.reduce((sum: number, r: AttendanceRecord) => sum + (r.hours_worked || 0), 0),
      overtimeHours: records.data.reduce((sum: number, r: AttendanceRecord) => sum + (r.overtime_hours || 0), 0),
      averageHoursPerDay: records.data.length > 0 ? 
        records.data.reduce((sum: number, r: AttendanceRecord) => sum + (r.hours_worked || 0), 0) / records.data.length : 0
    }

    return { data: summary, error: null }
  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    return { data: null, error }
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export async function clearHRCaches() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    dataService.clearAllCaches()
    return { success: true, message: 'All HR caches cleared' }
  } catch (error) {
    console.error('Error clearing caches:', error)
    return { success: false, error: 'Failed to clear caches' }
  }
}
