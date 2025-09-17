-- =============================================================================
-- OPENROAD DMS - SEED DATA
-- Initial data for system setup and testing
-- Version: 2.0
-- =============================================================================

-- =============================================================================
-- 1. COUNTRIES DATA
-- =============================================================================

INSERT INTO public.countries (code, name, phone_code, currency) VALUES
('IND', 'India', '+91', 'INR'),
('THA', 'Thailand', '+66', 'THB'),
('CHN', 'China', '+86', 'CNY'),
('USA', 'United States', '+1', 'USD'),
('GBR', 'United Kingdom', '+44', 'GBP'),
('JPN', 'Japan', '+81', 'JPY'),
('DEU', 'Germany', '+49', 'EUR'),
('FRA', 'France', '+33', 'EUR'),
('SGP', 'Singapore', '+65', 'SGD'),
('MYS', 'Malaysia', '+60', 'MYR'),
('IDN', 'Indonesia', '+62', 'IDR'),
('VNM', 'Vietnam', '+84', 'VND'),
('PHL', 'Philippines', '+63', 'PHP'),
('KOR', 'South Korea', '+82', 'KRW'),
('AUS', 'Australia', '+61', 'AUD')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 2. DEPARTMENTS DATA
-- =============================================================================

INSERT INTO public.departments (name, description) VALUES
('Human Resources', 'Employee management, payroll, and HR policies'),
('Finance', 'Financial planning, accounting, and budget management'),
('Sales', 'Vehicle sales and customer relations'),
('Purchase', 'Vehicle procurement and supplier management'),
('Maintenance', 'Vehicle maintenance and repair services'),
('Administration', 'General administration and office management'),
('IT', 'Information technology and system management')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 3. HOLIDAYS DATA (2025)
-- =============================================================================

-- Universal holidays
INSERT INTO public.holidays (name, date, type, description, country_code) VALUES
('New Year Day', '2025-01-01', 'Public', 'New Year celebration', NULL),
('Christmas Day', '2025-12-25', 'Public', 'Christmas celebration', NULL)
ON CONFLICT (date, country_code) DO NOTHING;

-- Indian holidays
INSERT INTO public.holidays (name, date, type, description, country_code) VALUES
('Republic Day', '2025-01-26', 'Public', 'India Republic Day', 'IND'),
('Independence Day', '2025-08-15', 'Public', 'India Independence Day', 'IND'),
('Gandhi Jayanti', '2025-10-02', 'Public', 'Mahatma Gandhi Birthday', 'IND'),
('Diwali', '2025-10-20', 'Religious', 'Festival of Lights', 'IND'),
('Holi', '2025-03-13', 'Religious', 'Festival of Colors', 'IND')
ON CONFLICT (date, country_code) DO NOTHING;

-- Thai holidays
INSERT INTO public.holidays (name, date, type, description, country_code) VALUES
('Songkran Festival', '2025-04-13', 'Public', 'Thai New Year', 'THA'),
('Songkran Festival', '2025-04-14', 'Public', 'Thai New Year', 'THA'),
('Songkran Festival', '2025-04-15', 'Public', 'Thai New Year', 'THA'),
('King Birthday', '2025-07-28', 'Public', 'King Vajiralongkorn Birthday', 'THA'),
('Queen Birthday', '2025-06-03', 'Public', 'Queen Suthida Birthday', 'THA')
ON CONFLICT (date, country_code) DO NOTHING;

-- =============================================================================
-- 4. SAMPLE ADMIN USER PROFILE
-- =============================================================================

-- This will be created automatically when the admin user signs up
-- The trigger will create the profile, but we can update it to admin role
-- Run this after creating the admin user in Supabase Auth

-- Update admin user to have admin role and all modules
-- Note: Replace 'admin@openroad.com' with actual admin email
UPDATE public.profiles 
SET 
    role = 'Admin',
    modules = ARRAY['HR', 'Finance', 'Sales', 'Purchase', 'Maintenance', 'Reports', 'Admin'],
    status = 'Active',
    department = 'Administration'
WHERE email = 'admin@openroad.com';

-- =============================================================================
-- 5. SAMPLE EMPLOYEES (for testing)
-- =============================================================================

-- Sample Indian employees
INSERT INTO public.employees (
    employee_id, name, email, phone, nationality, department, position, 
    hire_date, salary, status, personal_info, employment_details
) VALUES
(
    'IN-0001',
    'Rajesh Kumar',
    'rajesh.kumar@openroad.com',
    '+91-9876543210',
    'Indian',
    'Finance',
    'Financial Analyst',
    '2024-01-15',
    45000.00,
    'Active',
    '{"address": "Mumbai, India", "age": 28, "emergency_contact": "+91-9876543211"}',
    '{"probation_period": "3 months", "contract_type": "Full-time", "benefits": ["Health Insurance", "Provident Fund"]}'
),
(
    'IN-0002',
    'Priya Sharma',
    'priya.sharma@openroad.com',
    '+91-9876543212',
    'Indian',
    'Human Resources',
    'HR Specialist',
    '2024-02-01',
    42000.00,
    'Active',
    '{"address": "Delhi, India", "age": 26, "emergency_contact": "+91-9876543213"}',
    '{"probation_period": "3 months", "contract_type": "Full-time", "benefits": ["Health Insurance", "Provident Fund"]}'
)
ON CONFLICT (employee_id) DO NOTHING;

-- Sample Thai employees
INSERT INTO public.employees (
    employee_id, name, email, phone, nationality, department, position, 
    hire_date, salary, status, personal_info, employment_details
) VALUES
(
    'TH-0001',
    'Somchai Jaidee',
    'somchai.jaidee@openroad.com',
    '+66-81-234-5678',
    'Thai',
    'Sales',
    'Sales Executive',
    '2024-01-20',
    35000.00,
    'Active',
    '{"address": "Bangkok, Thailand", "age": 30, "emergency_contact": "+66-81-234-5679"}',
    '{"probation_period": "3 months", "contract_type": "Full-time", "benefits": ["Health Insurance", "Social Security"]}'
),
(
    'TH-0002',
    'Siriporn Thanakit',
    'siriporn.thanakit@openroad.com',
    '+66-81-234-5680',
    'Thai',
    'Purchase',
    'Procurement Specialist',
    '2024-02-15',
    38000.00,
    'Active',
    '{"address": "Chiang Mai, Thailand", "age": 27, "emergency_contact": "+66-81-234-5681"}',
    '{"probation_period": "3 months", "contract_type": "Full-time", "benefits": ["Health Insurance", "Social Security"]}'
)
ON CONFLICT (employee_id) DO NOTHING;

-- =============================================================================
-- 6. SAMPLE VEHICLES (for testing)
-- =============================================================================

INSERT INTO public.vehicles (
    id, license_plate, vehicle, date, seller, purchase_price, final_price,
    payment_type, status, full_data
) VALUES
(
    'V2025001',
    'ABC-1234',
    'Honda City 2020',
    '2025-01-15',
    'Local Dealer',
    850000.00,
    950000.00,
    'Bank Transfer',
    'Processing',
    '{"make": "Honda", "model": "City", "year": 2020, "color": "White", "fuel_type": "Petrol", "transmission": "Automatic", "mileage": 45000}'
),
(
    'V2025002',
    'XYZ-5678',
    'Toyota Camry 2021',
    '2025-01-20',
    'Private Seller',
    1200000.00,
    1350000.00,
    'Cash',
    'Completed',
    '{"make": "Toyota", "model": "Camry", "year": 2021, "color": "Silver", "fuel_type": "Petrol", "transmission": "Automatic", "mileage": 25000}'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. SAMPLE FINANCIAL RECORDS
-- =============================================================================

-- Sample income records
INSERT INTO public.financial_records (
    transaction_type, category, amount, description, transaction_date, 
    account, status, details
) VALUES
(
    'Income',
    'Vehicle Sales',
    1350000.00,
    'Sale of Toyota Camry 2021',
    '2025-01-25',
    'Main Account',
    'Completed',
    '{"vehicle_id": "V2025002", "customer": "John Doe", "payment_method": "Bank Transfer"}'
),
(
    'Expense',
    'Vehicle Purchase',
    1200000.00,
    'Purchase of Toyota Camry 2021',
    '2025-01-20',
    'Main Account',
    'Completed',
    '{"vehicle_id": "V2025002", "seller": "Private Seller", "payment_method": "Cash"}'
),
(
    'Expense',
    'Office Rent',
    25000.00,
    'Monthly office rent',
    '2025-01-01',
    'Main Account',
    'Completed',
    '{"period": "January 2025", "location": "Main Office"}'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. SAMPLE ATTENDANCE RECORDS
-- =============================================================================

-- Sample attendance for Indian employees (January 2025)
INSERT INTO public.attendance_records (
    employee_id, date, check_in, check_out, status, overtime_hours
) 
SELECT 
    e.id,
    generate_series('2025-01-01'::date, '2025-01-31'::date, interval '1 day')::date,
    '09:00:00'::time,
    '18:00:00'::time,
    CASE 
        WHEN EXTRACT(dow from generate_series('2025-01-01'::date, '2025-01-31'::date, interval '1 day')) IN (0,6) THEN 'Holiday'
        WHEN random() > 0.95 THEN 'Absent'
        WHEN random() > 0.9 THEN 'Late'
        ELSE 'Present'
    END,
    CASE 
        WHEN random() > 0.8 THEN (random() * 3)::decimal(4,2)
        ELSE 0
    END
FROM public.employees e
WHERE e.nationality = 'Indian'
ON CONFLICT (employee_id, date) DO NOTHING;

-- =============================================================================
-- 9. STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- =============================================================================

-- Create employee-files bucket for file uploads
-- This should be run in the Supabase Storage section:
-- 
-- Bucket name: employee-files
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- =============================================================================
-- 10. INITIAL SYSTEM CONFIGURATION
-- =============================================================================

-- Log initial setup
INSERT INTO public.system_logs (level, message, context, source) VALUES
(
    'INFO',
    'Database seed data initialized',
    '{"version": "2.0", "tables_seeded": ["countries", "departments", "holidays", "employees", "vehicles", "financial_records", "attendance_records"], "timestamp": "' || NOW()::text || '"}',
    'SEED_DATA'
);

-- Create initial activity log entry
INSERT INTO public.activity_logs (
    user_id, action, table_name, record_id, new_values
) VALUES
(
    NULL, -- System action
    'SEED_INITIALIZATION',
    'system_logs',
    'INIT',
    '{"message": "Database seeded with initial data", "version": "2.0"}'
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Uncomment these to verify data was inserted correctly:

-- SELECT 'Countries loaded: ' || COUNT(*)::text FROM public.countries;
-- SELECT 'Departments loaded: ' || COUNT(*)::text FROM public.departments;
-- SELECT 'Holidays loaded: ' || COUNT(*)::text FROM public.holidays;
-- SELECT 'Employees loaded: ' || COUNT(*)::text FROM public.employees;
-- SELECT 'Vehicles loaded: ' || COUNT(*)::text FROM public.vehicles;
-- SELECT 'Financial records loaded: ' || COUNT(*)::text FROM public.financial_records;
-- SELECT 'Attendance records loaded: ' || COUNT(*)::text FROM public.attendance_records;

-- =============================================================================
-- POST-SETUP INSTRUCTIONS
-- =============================================================================

/*
After running this seed data script:

1. Create an admin user in Supabase Auth Dashboard:
   - Email: Use your company admin email
   - Password: Use a secure password
   - Confirm the user account
   - Assign appropriate role in the profiles table

2. Create storage bucket in Supabase Dashboard:
   - Go to Storage section
   - Create new bucket: "employee-files"
   - Set as private (not public)
   - Configure file size limit: 10MB

3. Test the system:
   - Login with your admin credentials
   - Verify all modules are accessible
   - Test employee creation with nationality-based IDs
   - Test file upload functionality

4. Optional: Create additional test users for different roles as needed
*/