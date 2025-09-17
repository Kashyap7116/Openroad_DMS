-- =============================================================================
-- OPENROAD DMS - FUNCTIONS AND TRIGGERS
-- Database functions, triggers, and stored procedures
-- Version: 2.0
-- =============================================================================

-- =============================================================================
-- 1. UTILITY FUNCTIONS
-- =============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Generate employee ID based on nationality
CREATE OR REPLACE FUNCTION public.generate_employee_id(nationality TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    prefix TEXT;
    next_id INTEGER;
    result TEXT;
BEGIN
    -- Map nationality to prefix
    CASE UPPER(nationality)
        WHEN 'INDIAN' THEN prefix := 'IN';
        WHEN 'THAI' THEN prefix := 'TH';
        WHEN 'CHINESE' THEN prefix := 'CN';
        WHEN 'AMERICAN' THEN prefix := 'US';
        WHEN 'BRITISH' THEN prefix := 'GB';
        WHEN 'JAPANESE' THEN prefix := 'JP';
        WHEN 'GERMAN' THEN prefix := 'DE';
        WHEN 'FRENCH' THEN prefix := 'FR';
        ELSE prefix := 'XX'; -- Default for unknown nationalities
    END CASE;
    
    -- Get next ID for this nationality
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO next_id
    FROM public.employees
    WHERE employee_id LIKE (prefix || '-%');
    
    -- Format result
    result := prefix || '-' || LPAD(next_id::TEXT, 4, '0');
    
    RETURN result;
END;
$$;

-- Log activity function
CREATE OR REPLACE FUNCTION public.log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_table_name TEXT,
    p_record_id TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.activity_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        timestamp
    ) VALUES (
        p_user_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        NOW()
    );
END;
$$;

-- Calculate net salary function
CREATE OR REPLACE FUNCTION public.calculate_net_salary(
    base_salary DECIMAL(12,2),
    overtime_amount DECIMAL(12,2) DEFAULT 0,
    bonus_amount DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0
)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN base_salary + COALESCE(overtime_amount, 0) + COALESCE(bonus_amount, 0) - COALESCE(deductions, 0);
END;
$$;

-- =============================================================================
-- 2. PROFILE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Create user profile after auth registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email, role, modules, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        'Staff',
        ARRAY[]::TEXT[],
        'Active'
    );
    RETURN NEW;
END;
$$;

-- Update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET last_login = NOW()
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. AUDIT TRAIL FUNCTIONS
-- =============================================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    record_id TEXT;
BEGIN
    -- Handle different operations
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
        record_id := COALESCE(OLD.id::TEXT, OLD.employee_id::TEXT, 'unknown');
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        record_id := COALESCE(NEW.id::TEXT, NEW.employee_id::TEXT, 'unknown');
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
        record_id := COALESCE(NEW.id::TEXT, NEW.employee_id::TEXT, 'unknown');
    END IF;
    
    -- Log the activity
    INSERT INTO public.activity_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        record_id,
        old_data,
        new_data
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- =============================================================================
-- 4. BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- Calculate overtime pay
CREATE OR REPLACE FUNCTION public.calculate_overtime_pay(
    hourly_rate DECIMAL(10,2),
    overtime_hours DECIMAL(4,2),
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.5
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN hourly_rate * overtime_hours * overtime_multiplier;
END;
$$;

-- Get employee statistics
CREATE OR REPLACE FUNCTION public.get_employee_stats()
RETURNS TABLE (
    total_employees BIGINT,
    active_employees BIGINT,
    by_nationality JSONB,
    by_department JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE status = 'Active') as active_employees,
        jsonb_object_agg(nationality, cnt) as by_nationality,
        jsonb_object_agg(department, dept_cnt) as by_department
    FROM (
        SELECT 
            nationality,
            department,
            COUNT(*) as cnt,
            COUNT(*) as dept_cnt
        FROM public.employees
        GROUP BY ROLLUP(nationality, department)
    ) stats;
END;
$$;

-- Get financial summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_income DECIMAL(15,2),
    total_expenses DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set default dates if not provided
    start_date := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE));
    end_date := COALESCE(end_date, CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE -amount END), 0) as net_profit,
        COUNT(*) as transaction_count
    FROM public.financial_records
    WHERE transaction_date BETWEEN start_date AND end_date
    AND status = 'Completed';
END;
$$;

-- =============================================================================
-- 5. VALIDATION FUNCTIONS
-- =============================================================================

-- Validate email format
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Validate phone format
CREATE OR REPLACE FUNCTION public.is_valid_phone(phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Allow various phone formats
    RETURN phone ~ '^[\+]?[0-9\s\-\(\)]{7,15}$';
END;
$$;

-- =============================================================================
-- 6. DATA MIGRATION FUNCTIONS
-- =============================================================================

-- Migrate JSON data to structured tables
CREATE OR REPLACE FUNCTION public.migrate_json_to_structured()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT := 'Migration completed: ';
    migrated_count INTEGER := 0;
BEGIN
    -- This function would contain logic to migrate from JSON files
    -- to structured database tables if needed
    
    -- Example: Migrate employees from JSON
    -- (Implementation would depend on existing JSON structure)
    
    result := result || migrated_count::TEXT || ' records migrated';
    RETURN result;
END;
$$;

-- =============================================================================
-- 7. TRIGGERS SETUP
-- =============================================================================

-- Automatically update updated_at timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_financial_records_updated_at
    BEFORE UPDATE ON public.financial_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payroll_records_updated_at
    BEFORE UPDATE ON public.payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Automatically create profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update last login on sign in
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION public.update_last_login();

-- Audit trail triggers
CREATE TRIGGER employees_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER vehicles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER financial_records_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_records
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

-- Calculate net salary before insert/update
CREATE OR REPLACE FUNCTION public.calculate_payroll_net_salary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.net_salary := public.calculate_net_salary(
        NEW.base_salary,
        NEW.overtime_amount,
        NEW.bonus_amount,
        NEW.deductions
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_payroll_net_salary_trigger
    BEFORE INSERT OR UPDATE ON public.payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_payroll_net_salary();

-- =============================================================================
-- 8. UTILITY VIEWS
-- =============================================================================

-- Active employees view
CREATE OR REPLACE VIEW public.active_employees AS
SELECT 
    id,
    employee_id,
    name,
    email,
    phone,
    nationality,
    department,
    position,
    hire_date,
    salary,
    created_at
FROM public.employees
WHERE status = 'Active';

-- Monthly financial summary view
CREATE OR REPLACE VIEW public.monthly_financial_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    transaction_type,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM public.financial_records
WHERE status = 'Completed'
GROUP BY DATE_TRUNC('month', transaction_date), transaction_type, category
ORDER BY month DESC, transaction_type, category;

-- Employee attendance summary view
CREATE OR REPLACE VIEW public.employee_attendance_summary AS
SELECT 
    e.employee_id,
    e.name,
    DATE_TRUNC('month', ar.date) as month,
    COUNT(*) as total_days,
    COUNT(*) FILTER (WHERE ar.status = 'Present') as present_days,
    COUNT(*) FILTER (WHERE ar.status = 'Absent') as absent_days,
    COUNT(*) FILTER (WHERE ar.status = 'Late') as late_days,
    SUM(ar.overtime_hours) as total_overtime
FROM public.employees e
LEFT JOIN public.attendance_records ar ON e.id = ar.employee_id
GROUP BY e.id, e.employee_id, e.name, DATE_TRUNC('month', ar.date)
ORDER BY month DESC, e.name;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION public.generate_employee_id(TEXT) IS 'Generates nationality-based employee IDs (IN-0001, TH-0002, etc.)';
COMMENT ON FUNCTION public.log_activity IS 'Centralized activity logging function';
COMMENT ON FUNCTION public.get_employee_stats IS 'Returns comprehensive employee statistics';
COMMENT ON FUNCTION public.get_financial_summary IS 'Returns financial summary for a date range';
COMMENT ON VIEW public.active_employees IS 'Shows only active employees';
COMMENT ON VIEW public.monthly_financial_summary IS 'Monthly breakdown of financial transactions';