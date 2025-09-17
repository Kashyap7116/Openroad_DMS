/**
 * Finance Actions using Optimized Database Service
 * High-performance database operations with caching for financial management
 */

'use server'

import { dataService } from '@/lib/optimized-data-service'
import { getCurrentUser } from '@/modules/auth/services/supabase-auth-actions'

// ============================================================================
// FINANCIAL ADJUSTMENTS
// ============================================================================

export async function createFinancialAdjustment(adjustmentData: {
  employee_id?: string
  vehicle_id?: string
  adjustment_type: 'bonus' | 'deduction' | 'expense' | 'revenue' | 'tax'
  amount: number
  description: string
  category?: string
  date: string
  reference_number?: string
  approval_status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  notes?: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.createFinancialAdjustment({
      ...adjustmentData,
      approval_status: adjustmentData.approval_status || 'pending',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating financial adjustment:', error)
    return { success: false, error: 'Failed to create financial adjustment' }
  }
}

export async function getFinancialAdjustments(options: {
  employee_id?: string
  vehicle_id?: string
  adjustment_type?: string
  startDate?: string
  endDate?: string
  approval_status?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getFinancialAdjustments(options)
  } catch (error) {
    console.error('Error fetching financial adjustments:', error)
    return { data: [], error, count: 0 }
  }
}

export async function approveFinancialAdjustment(id: string, approved: boolean, notes?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.updateFinancialAdjustment(id, {
      approval_status: approved ? 'approved' : 'rejected',
      approved_by: currentUser.id,
      approval_date: new Date().toISOString(),
      notes: notes || undefined,
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error approving financial adjustment:', error)
    return { success: false, error: 'Failed to approve financial adjustment' }
  }
}

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

export async function getFinancialSummary(options: {
  startDate?: string
  endDate?: string
  includeProjections?: boolean
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const { startDate, endDate } = options
    
    // Get payroll data
    const payrollData = await dataService.getPayrollRecords({
      startDate,
      endDate,
      limit: 1000
    })

    // Get financial adjustments
    const adjustmentsData = await dataService.getFinancialAdjustments({
      startDate,
      endDate,
      approval_status: 'approved',
      limit: 1000
    })

    // Get transaction data
    const [purchaseTransactions, salesTransactions] = await Promise.all([
      dataService.getPurchaseTransactions({ startDate, endDate, limit: 1000 }),
      dataService.getSalesTransactions({ startDate, endDate, limit: 1000 })
    ])

    const payroll = payrollData.data || []
    const adjustments = adjustmentsData.data || []
    const purchases = purchaseTransactions.data || []
    const sales = salesTransactions.data || []

    // Calculate financial summary
    const summary = {
      revenue: {
        vehicleSales: sales.reduce((sum: number, t: any) => sum + (t.sale_price || 0), 0),
        otherRevenue: adjustments
          .filter((adj: any) => adj.adjustment_type === 'revenue')
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        total: 0
      },
      expenses: {
        payroll: payroll.reduce((sum: number, p: any) => sum + (p.net_pay || 0), 0),
        vehiclePurchases: purchases.reduce((sum: number, t: any) => sum + (t.purchase_price || 0), 0),
        bonuses: adjustments
          .filter((adj: any) => adj.adjustment_type === 'bonus')
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        otherExpenses: adjustments
          .filter((adj: any) => ['expense', 'deduction'].includes(adj.adjustment_type))
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        taxes: adjustments
          .filter((adj: any) => adj.adjustment_type === 'tax')
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        total: 0
      },
      netIncome: 0,
      taxLiability: payroll.reduce((sum: number, p: any) => sum + (p.tax_deduction || 0), 0),
      period: { startDate, endDate }
    }

    // Calculate totals
    summary.revenue.total = summary.revenue.vehicleSales + summary.revenue.otherRevenue
    summary.expenses.total = summary.expenses.payroll + summary.expenses.vehiclePurchases + 
                             summary.expenses.bonuses + summary.expenses.otherExpenses + 
                             summary.expenses.taxes
    summary.netIncome = summary.revenue.total - summary.expenses.total

    return { data: summary, error: null }
  } catch (error) {
    console.error('Error generating financial summary:', error)
    return { data: null, error }
  }
}

export async function getProfitLossReport(options: {
  startDate?: string
  endDate?: string
  groupBy?: 'month' | 'quarter' | 'year'
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const { startDate, endDate, groupBy = 'month' } = options
    
    // Get financial summary
    const summaryResult = await getFinancialSummary({ startDate, endDate })
    
    if (!summaryResult.data) {
      return { data: null, error: summaryResult.error }
    }

    const summary = summaryResult.data

    // Calculate key financial ratios
    const ratios = {
      grossProfitMargin: summary.revenue.total > 0 
        ? ((summary.revenue.total - summary.expenses.vehiclePurchases) / summary.revenue.total) * 100
        : 0,
      netProfitMargin: summary.revenue.total > 0 
        ? (summary.netIncome / summary.revenue.total) * 100
        : 0,
      operatingMargin: summary.revenue.total > 0 
        ? ((summary.revenue.total - summary.expenses.total + summary.expenses.taxes) / summary.revenue.total) * 100
        : 0
    }

    const report = {
      summary,
      ratios,
      performance: {
        totalRevenue: summary.revenue.total,
        totalExpenses: summary.expenses.total,
        netIncome: summary.netIncome,
        profitabilityStatus: summary.netIncome >= 0 ? 'profitable' : 'loss'
      },
      period: { startDate, endDate, groupBy }
    }

    return { data: report, error: null }
  } catch (error) {
    console.error('Error generating profit & loss report:', error)
    return { data: null, error }
  }
}

export async function getCashFlowReport(options: {
  startDate?: string
  endDate?: string
  includeProjections?: boolean
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const { startDate, endDate, includeProjections = false } = options
    
    // Get transaction data
    const [payrollData, salesData, purchaseData, adjustmentsData] = await Promise.all([
      dataService.getPayrollRecords({ startDate, endDate, limit: 1000 }),
      dataService.getSalesTransactions({ startDate, endDate, limit: 1000 }),
      dataService.getPurchaseTransactions({ startDate, endDate, limit: 1000 }),
      dataService.getFinancialAdjustments({ 
        startDate, 
        endDate, 
        approval_status: 'approved', 
        limit: 1000 
      })
    ])

    const payroll = payrollData.data || []
    const sales = salesData.data || []
    const purchases = purchaseData.data || []
    const adjustments = adjustmentsData.data || []

    // Calculate cash flows
    const cashFlow = {
      inflows: {
        vehicleSales: sales.reduce((sum: number, t: any) => sum + (t.sale_price || 0), 0),
        otherIncome: adjustments
          .filter((adj: any) => adj.adjustment_type === 'revenue')
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        total: 0
      },
      outflows: {
        payroll: payroll.reduce((sum: number, p: any) => sum + (p.net_pay || 0), 0),
        vehiclePurchases: purchases.reduce((sum: number, t: any) => sum + (t.purchase_price || 0), 0),
        expenses: adjustments
          .filter((adj: any) => ['expense', 'bonus', 'deduction'].includes(adj.adjustment_type))
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        taxes: adjustments
          .filter((adj: any) => adj.adjustment_type === 'tax')
          .reduce((sum: number, adj: any) => sum + adj.amount, 0),
        total: 0
      },
      netCashFlow: 0,
      period: { startDate, endDate }
    }

    // Calculate totals
    cashFlow.inflows.total = cashFlow.inflows.vehicleSales + cashFlow.inflows.otherIncome
    cashFlow.outflows.total = cashFlow.outflows.payroll + cashFlow.outflows.vehiclePurchases + 
                             cashFlow.outflows.expenses + cashFlow.outflows.taxes
    cashFlow.netCashFlow = cashFlow.inflows.total - cashFlow.outflows.total

    // Add cash flow health indicators
    const healthIndicators = {
      cashFlowStatus: cashFlow.netCashFlow >= 0 ? 'positive' : 'negative',
      liquidityRatio: cashFlow.outflows.total > 0 
        ? cashFlow.inflows.total / cashFlow.outflows.total 
        : 0,
      operatingCashFlow: cashFlow.inflows.vehicleSales - cashFlow.outflows.vehiclePurchases
    }

    return { 
      data: { 
        ...cashFlow, 
        healthIndicators,
        includeProjections 
      }, 
      error: null 
    }
  } catch (error) {
    console.error('Error generating cash flow report:', error)
    return { data: null, error }
  }
}

// ============================================================================
// BUDGET AND PLANNING
// ============================================================================

export async function createBudget(budgetData: {
  name: string
  period_start: string
  period_end: string
  budget_items: {
    category: string
    budgeted_amount: number
    description?: string
  }[]
  status?: 'draft' | 'active' | 'completed'
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.createBudget({
      ...budgetData,
      status: budgetData.status || 'draft',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating budget:', error)
    return { success: false, error: 'Failed to create budget' }
  }
}

export async function getBudgets(options: {
  status?: string
  year?: number
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getBudgets(options)
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return { data: [], error, count: 0 }
  }
}

export async function getBudgetVarianceReport(budgetId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const budget = await dataService.getBudgetById(budgetId)
    if (!budget) {
      return { data: null, error: { message: 'Budget not found' } }
    }

    // Get actual financial data for the budget period
    const financialSummary = await getFinancialSummary({
      startDate: budget.period_start,
      endDate: budget.period_end
    })

    if (!financialSummary.data) {
      return { data: null, error: financialSummary.error }
    }

    // Calculate variances for each budget item
    const variances = budget.budget_items.map((item: any) => {
      const actualAmount = getActualAmountForCategory(item.category, financialSummary.data)
      const variance = actualAmount - item.budgeted_amount
      const variancePercent = item.budgeted_amount > 0 
        ? (variance / item.budgeted_amount) * 100 
        : 0

      return {
        category: item.category,
        budgeted: item.budgeted_amount,
        actual: actualAmount,
        variance,
        variancePercent,
        status: variance > 0 ? 'over' : variance < 0 ? 'under' : 'on_budget'
      }
    })

    const totalBudgeted = budget.budget_items.reduce((sum: number, item: any) => sum + item.budgeted_amount, 0)
    const totalActual = variances.reduce((sum: number, v: any) => sum + v.actual, 0)
    const totalVariance = totalActual - totalBudgeted

    return {
      data: {
        budget,
        variances,
        summary: {
          totalBudgeted,
          totalActual,
          totalVariance,
          totalVariancePercent: totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0,
          overallStatus: totalVariance > 0 ? 'over_budget' : 'under_budget'
        }
      },
      error: null
    }
  } catch (error) {
    console.error('Error generating budget variance report:', error)
    return { data: null, error }
  }
}

// Helper function to map budget categories to actual financial data
function getActualAmountForCategory(category: string, financialData: any): number {
  switch (category.toLowerCase()) {
    case 'payroll':
    case 'salaries':
      return financialData.expenses.payroll
    case 'vehicle_purchases':
    case 'inventory':
      return financialData.expenses.vehiclePurchases
    case 'bonuses':
      return financialData.expenses.bonuses
    case 'expenses':
    case 'operating_expenses':
      return financialData.expenses.otherExpenses
    case 'taxes':
      return financialData.expenses.taxes
    case 'revenue':
    case 'sales':
      return financialData.revenue.total
    default:
      return 0
  }
}
