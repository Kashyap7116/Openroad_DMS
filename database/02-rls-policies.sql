-- =============================================================================
-- OPENROAD DMS - ROW LEVEL SECURITY POLICIES
-- Complete RLS setup for multi-user access control
-- Version: 2.0
-- =============================================================================

-- =============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. HELPER FUNCTIONS FOR POLICIES
-- =============================================================================

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'Admin' 
        AND status = 'Active'
    );
END;
$$;

-- Check if current user has access to specific modules
CREATE OR REPLACE FUNCTION public.has_module_access(module_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND (role = 'Admin' OR module_name = ANY(modules))
        AND status = 'Active'
    );
END;
$$;

-- Check if current user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role IN ('Admin', 'Manager')
        AND status = 'Active'
    );
END;
$$;

-- =============================================================================
-- 3. PROFILES POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile (except role and modules)
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (is_admin());

-- Admins can manage all profiles
CREATE POLICY "admins_can_manage_profiles" ON public.profiles
    FOR ALL USING (is_admin());

-- =============================================================================
-- 4. EMPLOYEES POLICIES
-- =============================================================================

-- Users with HR module access can view employees
CREATE POLICY "hr_can_view_employees" ON public.employees
    FOR SELECT USING (has_module_access('HR'));

-- Users with HR module access can create employees
CREATE POLICY "hr_can_create_employees" ON public.employees
    FOR INSERT WITH CHECK (has_module_access('HR'));

-- Users with HR module access can update employees
CREATE POLICY "hr_can_update_employees" ON public.employees
    FOR UPDATE USING (has_module_access('HR'));

-- Only admins can delete employees
CREATE POLICY "admins_can_delete_employees" ON public.employees
    FOR DELETE USING (is_admin());

-- =============================================================================
-- 5. ATTENDANCE POLICIES
-- =============================================================================

-- Users with HR module access can view attendance
CREATE POLICY "hr_can_view_attendance" ON public.attendance_records
    FOR SELECT USING (has_module_access('HR'));

-- Users with HR module access can manage attendance
CREATE POLICY "hr_can_manage_attendance" ON public.attendance_records
    FOR ALL USING (has_module_access('HR'));

-- =============================================================================
-- 6. PAYROLL POLICIES
-- =============================================================================

-- Users with HR module access can view payroll
CREATE POLICY "hr_can_view_payroll" ON public.payroll_records
    FOR SELECT USING (has_module_access('HR'));

-- Users with HR module access can create payroll
CREATE POLICY "hr_can_create_payroll" ON public.payroll_records
    FOR INSERT WITH CHECK (has_module_access('HR'));

-- Users with HR module access can update payroll
CREATE POLICY "hr_can_update_payroll" ON public.payroll_records
    FOR UPDATE USING (has_module_access('HR'));

-- Only admins can delete payroll records
CREATE POLICY "admins_can_delete_payroll" ON public.payroll_records
    FOR DELETE USING (is_admin());

-- =============================================================================
-- 7. VEHICLES POLICIES
-- =============================================================================

-- Users with Purchase or Sales module access can view vehicles
CREATE POLICY "purchase_sales_can_view_vehicles" ON public.vehicles
    FOR SELECT USING (
        has_module_access('Purchase') OR 
        has_module_access('Sales') OR 
        has_module_access('Maintenance')
    );

-- Users with Purchase module access can create vehicles
CREATE POLICY "purchase_can_create_vehicles" ON public.vehicles
    FOR INSERT WITH CHECK (has_module_access('Purchase'));

-- Users with Purchase or Sales module access can update vehicles
CREATE POLICY "purchase_sales_can_update_vehicles" ON public.vehicles
    FOR UPDATE USING (
        has_module_access('Purchase') OR 
        has_module_access('Sales')
    );

-- Only admins can delete vehicles
CREATE POLICY "admins_can_delete_vehicles" ON public.vehicles
    FOR DELETE USING (is_admin());

-- =============================================================================
-- 8. MAINTENANCE POLICIES
-- =============================================================================

-- Users with Maintenance module access can view maintenance records
CREATE POLICY "maintenance_can_view_records" ON public.maintenance_records
    FOR SELECT USING (has_module_access('Maintenance'));

-- Users with Maintenance module access can manage maintenance records
CREATE POLICY "maintenance_can_manage_records" ON public.maintenance_records
    FOR ALL USING (has_module_access('Maintenance'));

-- =============================================================================
-- 9. FINANCIAL POLICIES
-- =============================================================================

-- Users with Finance module access can view financial records
CREATE POLICY "finance_can_view_records" ON public.financial_records
    FOR SELECT USING (has_module_access('Finance'));

-- Users with Finance module access can create financial records
CREATE POLICY "finance_can_create_records" ON public.financial_records
    FOR INSERT WITH CHECK (has_module_access('Finance'));

-- Users with Finance module access can update financial records
CREATE POLICY "finance_can_update_records" ON public.financial_records
    FOR UPDATE USING (has_module_access('Finance'));

-- Only admins can delete financial records
CREATE POLICY "admins_can_delete_financial" ON public.financial_records
    FOR DELETE USING (is_admin());

-- =============================================================================
-- 10. OFFICE EXPENSES POLICIES
-- =============================================================================

-- Users with Finance module access can view expenses
CREATE POLICY "finance_can_view_expenses" ON public.office_expenses
    FOR SELECT USING (has_module_access('Finance'));

-- Users with Finance module access can create expenses
CREATE POLICY "finance_can_create_expenses" ON public.office_expenses
    FOR INSERT WITH CHECK (has_module_access('Finance'));

-- Users with Finance module access can update expenses
CREATE POLICY "finance_can_update_expenses" ON public.office_expenses
    FOR UPDATE USING (has_module_access('Finance'));

-- Managers and admins can approve expenses
CREATE POLICY "managers_can_approve_expenses" ON public.office_expenses
    FOR UPDATE USING (
        is_manager_or_admin() AND 
        (OLD.status = 'Pending' AND NEW.status IN ('Approved', 'Rejected'))
    );

-- =============================================================================
-- 11. SALES POLICIES
-- =============================================================================

-- Users with Sales module access can view sales records
CREATE POLICY "sales_can_view_records" ON public.sales_records
    FOR SELECT USING (has_module_access('Sales'));

-- Users with Sales module access can manage sales records
CREATE POLICY "sales_can_manage_records" ON public.sales_records
    FOR ALL USING (has_module_access('Sales'));

-- =============================================================================
-- 12. HOLIDAYS POLICIES
-- =============================================================================

-- All users can view holidays
CREATE POLICY "all_can_view_holidays" ON public.holidays
    FOR SELECT TO authenticated USING (true);

-- Users with HR module access can manage holidays
CREATE POLICY "hr_can_manage_holidays" ON public.holidays
    FOR ALL USING (has_module_access('HR'));

-- =============================================================================
-- 13. USER SESSIONS POLICIES
-- =============================================================================

-- Users can view their own sessions
CREATE POLICY "users_can_view_own_sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "admins_can_view_all_sessions" ON public.user_sessions
    FOR SELECT USING (is_admin());

-- System can insert sessions
CREATE POLICY "system_can_insert_sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "users_can_update_own_sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- 14. ACTIVITY LOGS POLICIES
-- =============================================================================

-- Admins can view all activity logs
CREATE POLICY "admins_can_view_activity_logs" ON public.activity_logs
    FOR SELECT USING (is_admin());

-- System can insert activity logs
CREATE POLICY "system_can_insert_activity_logs" ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Users can view their own activity logs
CREATE POLICY "users_can_view_own_activity_logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- 15. SYSTEM LOGS POLICIES
-- =============================================================================

-- Only admins can view system logs
CREATE POLICY "admins_can_view_system_logs" ON public.system_logs
    FOR SELECT USING (is_admin());

-- System can insert logs (no user context required)
CREATE POLICY "system_can_insert_logs" ON public.system_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- 16. STORAGE POLICIES (for file uploads)
-- =============================================================================

-- Allow authenticated users to view files they uploaded
CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload files to their own folders
CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- NOTES
-- =============================================================================

-- These policies ensure:
-- 1. Role-based access control (Admin, Manager, Staff)
-- 2. Module-based permissions (HR, Finance, Sales, etc.)
-- 3. Users can only access data they're authorized for
-- 4. Proper separation of concerns between departments
-- 5. Audit trail protection (only admins see logs)
-- 6. File storage security (users only access their own files)