import { saveVehicle } from "@/lib/supabase-operations";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Adding sample data to database...");

    // Create sample vehicles
    const sampleVehicles = [
      {
        vehicle_id: "HR16AC2860",
        make: "Honda",
        model: "City",
        year: 2016,
        vehicle_type: "Sedan",
        license_plate: "HR16AC2860",
        status: "Available",
        purchase_info: {
          purchase_date: "2016-03-15",
          purchase_price: 800000,
          dealer: "Honda Showroom",
        },
        current_info: {
          mileage: 45000,
          fuel_type: "Petrol",
          color: "White",
        },
      },
      {
        vehicle_id: "HR16AD2820",
        make: "Toyota",
        model: "Innova",
        year: 2016,
        vehicle_type: "SUV",
        license_plate: "HR16AD2820",
        status: "Available",
        purchase_info: {
          purchase_date: "2016-04-20",
          purchase_price: 1200000,
          dealer: "Toyota Showroom",
        },
        current_info: {
          mileage: 38000,
          fuel_type: "Diesel",
          color: "Silver",
        },
      },
    ];

    // Create sample employees
    const sampleEmployees = [
      {
        employee_id: "IN-001",
        personal_info: {
          name: "Rajesh Kumar",
          email: "rajesh.kumar@openroad.com",
          phone: "+91-9876543210",
          nationality: "Indian",
          date_of_birth: "1985-06-15",
          address: "123 MG Road, Bangalore, India",
        },
        employment_info: {
          department: "Sales",
          designation: "Sales Manager",
          date_of_joining: "2020-01-15",
          employee_type: "Full Time",
          salary: 75000,
        },
        documents: {},
        qualification: {
          degree: "MBA",
          institution: "IIM Bangalore",
        },
        emergency_contact: {
          name: "Priya Kumar",
          relationship: "Wife",
          phone: "+91-9876543211",
        },
        experience: {
          years: 8,
          previous_company: "Maruti Suzuki",
        },
      },
      {
        employee_id: "TH-001",
        personal_info: {
          name: "Somchai Jaidee",
          email: "somchai.jaidee@openroad.com",
          phone: "+66-81-234-5678",
          nationality: "Thai",
          date_of_birth: "1990-03-20",
          address: "456 Sukhumvit Road, Bangkok, Thailand",
        },
        employment_info: {
          department: "Service",
          designation: "Service Technician",
          date_of_joining: "2021-06-01",
          employee_type: "Full Time",
          salary: 45000,
        },
        documents: {},
        qualification: {
          degree: "Diploma in Automotive Technology",
          institution: "Bangkok Technical College",
        },
        emergency_contact: {
          name: "Niran Jaidee",
          relationship: "Father",
          phone: "+66-81-234-5679",
        },
        experience: {
          years: 5,
          previous_company: "Toyota Service Center",
        },
      },
    ];

    const results = {
      vehicles: [] as Array<{ id: string; success: boolean; error?: string }>,
      employees: [] as Array<{ id: string; success: boolean; error?: string }>,
    };

    // Save vehicles
    for (const vehicle of sampleVehicles) {
      try {
        const result = await saveVehicle(vehicle.vehicle_id, vehicle, false);
        results.vehicles.push({
          id: vehicle.vehicle_id,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        results.vehicles.push({
          id: vehicle.vehicle_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Save employees
    const { saveEmployee } = await import("@/lib/supabase-operations");
    for (const employee of sampleEmployees) {
      try {
        const result = await saveEmployee(
          employee.employee_id,
          employee,
          false
        );
        results.employees.push({
          id: employee.employee_id,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        results.employees.push({
          id: employee.employee_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      message: "Sample data insertion completed",
      results,
      summary: {
        vehiclesAdded: results.vehicles.filter((v) => v.success).length,
        employeesAdded: results.employees.filter((e) => e.success).length,
        totalVehicles: sampleVehicles.length,
        totalEmployees: sampleEmployees.length,
      },
    });
  } catch (error) {
    console.error("Sample data insertion failed:", error);
    return NextResponse.json(
      {
        error: "Sample data insertion failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
