/**
 * Vehicle Actions using Optimized Database Service
 * High-performance database operations with caching for vehicle management
 */

'use server'

import { dataService } from '@/lib/optimized-data-service'
import { getCurrentUser } from '@/modules/auth/services/supabase-auth-actions'
import type { Vehicle } from '@/lib/optimized-data-service'

// ============================================================================
// VEHICLE MANAGEMENT
// ============================================================================

export async function getVehicles(options: {
  status?: string
  make?: string
  model?: string
  search?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getVehicles(options)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return { data: [], error, count: 0 }
  }
}

export async function getVehicleById(id: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const vehicle = await dataService.getVehicleById(id)
    return { data: vehicle, error: null }
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    return { data: null, error }
  }
}

export async function getVehicleByRegistration(registrationNumber: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const vehicles = await dataService.getVehicles({
      search: registrationNumber,
      limit: 1
    })

    const vehicle = vehicles.data?.find((v: Vehicle) => 
      v.registration_number.toLowerCase() === registrationNumber.toLowerCase()
    )

    return { data: vehicle || null, error: null }
  } catch (error) {
    console.error('Error fetching vehicle by registration:', error)
    return { data: null, error }
  }
}

export async function createVehicle(vehicleData: Partial<Vehicle>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate required fields
    if (!vehicleData.registration_number || !vehicleData.make || !vehicleData.model) {
      return { success: false, error: 'Registration number, make, and model are required' }
    }

    // Check for duplicate registration number
    const existingVehicle = await getVehicleByRegistration(vehicleData.registration_number)
    if (existingVehicle.data) {
      return { success: false, error: 'Vehicle with this registration number already exists' }
    }

    const result = await dataService.createVehicle({
      ...vehicleData,
      status: vehicleData.status || 'available',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating vehicle:', error)
    return { success: false, error: 'Failed to create vehicle' }
  }
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    // If updating registration number, check for duplicates
    if (updates.registration_number) {
      const existingVehicle = await getVehicleByRegistration(updates.registration_number)
      if (existingVehicle.data && existingVehicle.data.id !== id) {
        return { success: false, error: 'Vehicle with this registration number already exists' }
      }
    }

    const result = await dataService.updateVehicle(id, {
      ...updates,
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error updating vehicle:', error)
    return { success: false, error: 'Failed to update vehicle' }
  }
}

export async function deleteVehicle(id: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'Admin') {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.deleteVehicle(id)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, message: 'Vehicle deleted successfully' }
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return { success: false, error: 'Failed to delete vehicle' }
  }
}

// ============================================================================
// VEHICLE TRANSACTIONS
// ============================================================================

export async function createPurchaseTransaction(transactionData: {
  vehicle_id: string
  purchase_date: string
  purchase_price: number
  seller_name: string
  seller_contact?: string
  payment_method?: string
  documents?: any
  notes?: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.createPurchaseTransaction({
      ...transactionData,
      transaction_type: 'purchase',
      status: 'completed',
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    // Update vehicle status to 'in_stock'
    await dataService.updateVehicle(transactionData.vehicle_id, {
      status: 'in_stock',
      purchase_price: transactionData.purchase_price,
      purchase_date: transactionData.purchase_date
    })

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating purchase transaction:', error)
    return { success: false, error: 'Failed to create purchase transaction' }
  }
}

export async function createSalesTransaction(transactionData: {
  vehicle_id: string
  sale_date: string
  sale_price: number
  buyer_name: string
  buyer_contact?: string
  payment_method?: string
  documents?: any
  notes?: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.createSalesTransaction({
      ...transactionData,
      transaction_type: 'sale',
      status: 'completed',
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    // Update vehicle status to 'sold'
    await dataService.updateVehicle(transactionData.vehicle_id, {
      status: 'sold',
      current_owner: transactionData.buyer_name
    })

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating sales transaction:', error)
    return { success: false, error: 'Failed to create sales transaction' }
  }
}

export async function getVehicleTransactions(vehicleId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' } }
    }

    const [purchaseTransactions, salesTransactions] = await Promise.all([
      dataService.getPurchaseTransactions({ vehicle_id: vehicleId }),
      dataService.getSalesTransactions({ vehicle_id: vehicleId })
    ])

    const transactions = [
      ...(purchaseTransactions.data || []),
      ...(salesTransactions.data || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { data: transactions, error: null }
  } catch (error) {
    console.error('Error fetching vehicle transactions:', error)
    return { data: [], error }
  }
}

// ============================================================================
// MAINTENANCE RECORDS
// ============================================================================

export async function createMaintenanceRecord(maintenanceData: {
  vehicle_id: string
  maintenance_date: string
  maintenance_type: string
  description: string
  cost: number
  service_provider?: string
  next_maintenance_date?: string
  documents?: any
  notes?: string
}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await dataService.createMaintenanceRecord({
      ...maintenanceData,
      status: 'completed',
      created_by: currentUser.id,
      created_at: new Date().toISOString()
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error creating maintenance record:', error)
    return { success: false, error: 'Failed to create maintenance record' }
  }
}

export async function getMaintenanceRecords(options: {
  vehicle_id?: string
  maintenance_type?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
} = {}) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' }, count: 0 }
    }

    return await dataService.getMaintenanceRecords(options)
  } catch (error) {
    console.error('Error fetching maintenance records:', error)
    return { data: [], error, count: 0 }
  }
}

export async function getUpcomingMaintenance() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { data: [], error: { message: 'Unauthorized' } }
    }

    const today = new Date()
    const futureDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000)) // Next 30 days

    const maintenanceRecords = await dataService.getMaintenanceRecords({
      startDate: today.toISOString().split('T')[0],
      endDate: futureDate.toISOString().split('T')[0],
      limit: 100
    })

    return { data: maintenanceRecords.data || [], error: null }
  } catch (error) {
    console.error('Error fetching upcoming maintenance:', error)
    return { data: [], error }
  }
}

// ============================================================================
// VEHICLE ANALYTICS
// ============================================================================

export async function getVehicleStats() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const vehicles = await dataService.getVehicles({ limit: 1000 })
    
    if (!vehicles.data) {
      return { data: null, error: vehicles.error }
    }

    const stats = {
      total: vehicles.count || vehicles.data.length,
      byStatus: vehicles.data.reduce((acc: any, vehicle: Vehicle) => {
        acc[vehicle.status] = (acc[vehicle.status] || 0) + 1
        return acc
      }, {}),
      byMake: vehicles.data.reduce((acc: any, vehicle: Vehicle) => {
        acc[vehicle.make] = (acc[vehicle.make] || 0) + 1
        return acc
      }, {}),
      totalValue: vehicles.data.reduce((sum: number, vehicle: Vehicle) => 
        sum + (vehicle.purchase_price || 0), 0),
      averagePrice: vehicles.data.length > 0 
        ? vehicles.data.reduce((sum: number, vehicle: Vehicle) => 
            sum + (vehicle.purchase_price || 0), 0) / vehicles.data.length
        : 0
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Error fetching vehicle stats:', error)
    return { data: null, error }
  }
}

export async function getInventoryReport(startDate?: string, endDate?: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || !['Admin', 'Manager'].includes(currentUser.role)) {
      return { data: null, error: { message: 'Unauthorized' } }
    }

    const vehicles = await dataService.getVehicles({ limit: 1000 })
    let purchaseTransactions = []
    let salesTransactions = []

    if (startDate && endDate) {
      const purchaseResult = await dataService.getPurchaseTransactions({
        startDate,
        endDate,
        limit: 1000
      })
      const salesResult = await dataService.getSalesTransactions({
        startDate,
        endDate,
        limit: 1000
      })
      
      purchaseTransactions = purchaseResult.data || []
      salesTransactions = salesResult.data || []
    }

    const report = {
      inventory: {
        total: vehicles.count || vehicles.data?.length || 0,
        available: vehicles.data?.filter((v: Vehicle) => v.status === 'available').length || 0,
        sold: vehicles.data?.filter((v: Vehicle) => v.status === 'sold').length || 0,
        maintenance: vehicles.data?.filter((v: Vehicle) => v.status === 'maintenance').length || 0
      },
      transactions: {
        purchases: purchaseTransactions.length,
        sales: salesTransactions.length,
        purchaseValue: purchaseTransactions.reduce((sum: number, t: any) => sum + (t.purchase_price || 0), 0),
        salesValue: salesTransactions.reduce((sum: number, t: any) => sum + (t.sale_price || 0), 0)
      },
      profitLoss: {
        revenue: salesTransactions.reduce((sum: number, t: any) => sum + (t.sale_price || 0), 0),
        costs: purchaseTransactions.reduce((sum: number, t: any) => sum + (t.purchase_price || 0), 0),
        profit: salesTransactions.reduce((sum: number, t: any) => sum + (t.sale_price || 0), 0) - 
                purchaseTransactions.reduce((sum: number, t: any) => sum + (t.purchase_price || 0), 0)
      }
    }

    return { data: report, error: null }
  } catch (error) {
    console.error('Error generating inventory report:', error)
    return { data: null, error }
  }
}
