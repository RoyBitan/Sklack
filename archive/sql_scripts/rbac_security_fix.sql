-- =====================================================
-- RBAC SECURITY FIX: Role Standardization & IDOR Protection
-- Date: 2026-01-20
-- Priority: CRITICAL
-- =====================================================
-- 
-- This script implements the security fixes identified in RBAC_AUDIT_REPORT.md
--
-- ⚠️ IMPORTANT: Run this during a maintenance window
-- ⚠️ BACKUP YOUR DATABASE FIRST
--
-- =====================================================

-- =====================================================
-- PHASE 1: ROLE STANDARDIZATION
-- =====================================================

-- Step 1: Add the new STAFF role to the enum
-- NOTE: We must commit this change before using the new value
COMMIT;
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'STAFF';
COMMIT;

BEGIN;

-- Step 2: Migrate existing roles to STAFF
UPDATE public.profiles 
SET role = 'STAFF'::public.user_role 
WHERE role IN ('DEPUTY_MANAGER', 'TEAM');

-- Step 3: Update all RLS policies to use STAFF instead of DEPUTY_MANAGER/TEAM

-- Organizations
DROP POLICY IF EXISTS "orgs_updatable_by_managers" ON public.organizations;
CREATE POLICY "orgs_updatable_by_managers" ON public.organizations 
    FOR UPDATE USING (id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF'));

-- Profiles  
DROP POLICY IF EXISTS "profiles_updatable_by_managers" ON public.profiles;
CREATE POLICY "profiles_updatable_by_managers" ON public.profiles 
    FOR UPDATE USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF'));

-- STRICT PROFILE VISIBILITY
-- 1. Customers: See Managers/Staff + Themselves (NO other customers)
-- 2. Staff: See Managers/Staff + Customers they are Assigned to
-- 3. Super Manager: See All
DROP POLICY IF EXISTS "profiles_viewable_by_org_members" ON public.profiles;
CREATE POLICY "profiles_viewable_by_org_members" ON public.profiles 
    FOR SELECT USING (
        org_id = get_my_org_id() AND (
            -- Everyone sees themselves
            id = auth.uid()
            OR
            -- Everyone sees Managers and Staff
            role IN ('SUPER_MANAGER', 'STAFF')
            OR
            -- Viewing a Customer Profile?
            (
                role = 'CUSTOMER' AND (
                    -- Super Manager sees all
                    get_my_role() = 'SUPER_MANAGER'
                    OR
                    -- Staff sees ONLY if assigned to a task for this customer
                    (
                        get_my_role() = 'STAFF' AND 
                        EXISTS (
                            SELECT 1 FROM public.tasks 
                            WHERE tasks.customer_id = profiles.id 
                            AND tasks.org_id = profiles.org_id
                            AND auth.uid() = ANY(tasks.assigned_to)
                        )
                    )
                )
            )
        )
    );

-- Vehicles
DROP POLICY IF EXISTS "vehicles_manageable_by_managers" ON public.vehicles;
CREATE POLICY "vehicles_manageable_by_managers" ON public.vehicles 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() = 'SUPER_MANAGER');

-- Tasks  
DROP POLICY IF EXISTS "tasks_viewable_by_staff" ON public.tasks;
CREATE POLICY "tasks_viewable_by_staff" ON public.tasks 
    FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "tasks_manageable_by_managers" ON public.tasks;
CREATE POLICY "tasks_manageable_by_managers" ON public.tasks 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() = 'SUPER_MANAGER');

-- STAFF can only update specific fields on tasks they're assigned to
DROP POLICY IF EXISTS "tasks_updatable_by_assigned_staff" ON public.tasks;
CREATE POLICY "tasks_updatable_by_assigned_staff" ON public.tasks 
    FOR UPDATE USING (
        org_id = get_my_org_id() AND 
        get_my_role() = 'STAFF' AND 
        auth.uid() = ANY(assigned_to)
    )
    WITH CHECK (
        org_id = get_my_org_id() AND
        get_my_role() = 'STAFF' AND
        auth.uid() = ANY(assigned_to)
    );

-- Add Trigger to enforce field immutability for STAFF (since RLS cannot reference OLD in CHECK)
CREATE OR REPLACE FUNCTION public.check_staff_task_updates() 
RETURNS TRIGGER AS $$
DECLARE
    current_role public.user_role;
BEGIN
    SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
    
    IF current_role = 'STAFF' THEN
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id OR
           OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
           OLD.created_by IS DISTINCT FROM NEW.created_by OR
           OLD.price IS DISTINCT FROM NEW.price THEN
            RAISE EXCEPTION 'Unauthorized: Staff can only update status, dates, and description';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_staff_task_fields ON public.tasks;
CREATE TRIGGER enforce_staff_task_fields
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION check_staff_task_updates();

DROP POLICY IF EXISTS "tasks_insertable_by_org_members" ON public.tasks;
CREATE POLICY "tasks_insertable_by_org_members" ON public.tasks 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND (
            -- Managers and staff can create tasks
            get_my_role() IN ('SUPER_MANAGER', 'STAFF') OR
            -- Customers can ONLY create tasks where they are the customer
            (get_my_role() = 'CUSTOMER' AND customer_id = auth.uid())
        )
    );

-- Appointments
DROP POLICY IF EXISTS "appointments_manageable_by_managers" ON public.appointments;
CREATE POLICY "appointments_manageable_by_managers" ON public.appointments 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF'));

DROP POLICY IF EXISTS "appointments_insertable_by_org_members" ON public.appointments;
CREATE POLICY "appointments_insertable_by_org_members" ON public.appointments 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND (
            customer_id = auth.uid() OR 
            get_my_role() IN ('SUPER_MANAGER', 'STAFF')
        )
    );

-- Invitations
DROP POLICY IF EXISTS "invitations_manageable_by_managers" ON public.invitations;
CREATE POLICY "invitations_manageable_by_managers" ON public.invitations 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() = 'SUPER_MANAGER');

-- Proposals
DROP POLICY IF EXISTS "proposals_manageable_by_managers" ON public.proposals;
CREATE POLICY "proposals_manageable_by_managers" ON public.proposals 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF'));

-- Audit Logs
DROP POLICY IF EXISTS "audit_logs_viewable_by_managers" ON public.audit_logs;
CREATE POLICY "audit_logs_viewable_by_managers" ON public.audit_logs 
    FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'SUPER_MANAGER');

-- =====================================================
-- PHASE 2: CUSTOMER DATA ISOLATION (CRITICAL)
-- =====================================================

-- Fix Task Visibility for Customers - MUST filter by customer_id
DROP POLICY IF EXISTS "tasks_viewable_by_customers" ON public.tasks;
CREATE POLICY "tasks_viewable_by_customers" ON public.tasks 
    FOR SELECT USING (
        get_my_role() = 'CUSTOMER' AND (
            auth.uid() = customer_id OR 
            auth.uid() = created_by OR
            -- Check vehicle ownership WITHOUT subquery (more secure)
            EXISTS (
                SELECT 1 FROM public.vehicles v 
                WHERE v.id = vehicle_id 
                AND v.owner_id = auth.uid()
                LIMIT 1
            )
        )
    );

-- Fix Vehicle Visibility for Customers
DROP POLICY IF EXISTS "vehicles_viewable_by_org_members" ON public.vehicles;
CREATE POLICY "vehicles_viewable_by_org_members" ON public.vehicles 
    FOR SELECT USING (
        org_id = get_my_org_id() AND (
            get_my_role() IN ('SUPER_MANAGER', 'STAFF') OR
            (get_my_role() = 'CUSTOMER' AND owner_id = auth.uid())
        )
    );

-- Customers can ONLY manage their own vehicles
DROP POLICY IF EXISTS "vehicles_manageable_by_owners" ON public.vehicles;
CREATE POLICY "vehicles_manageable_by_owners" ON public.vehicles 
    FOR ALL USING (
        get_my_role() = 'CUSTOMER' AND 
        owner_id = auth.uid()
    )
    WITH CHECK (
        owner_id = auth.uid() AND 
        org_id = get_my_org_id()
    );

-- Fix Appointment Visibility
DROP POLICY IF EXISTS "appointments_viewable_by_members" ON public.appointments;
CREATE POLICY "appointments_viewable_by_members" ON public.appointments 
    FOR SELECT USING (
        (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF')) OR
        (get_my_role() = 'CUSTOMER' AND customer_id = auth.uid())
    );

-- Fix Proposal Visibility
DROP POLICY IF EXISTS "proposals_viewable_by_org_members" ON public.proposals;
CREATE POLICY "proposals_viewable_by_org_members" ON public.proposals 
    FOR SELECT USING (
        (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF')) OR
        (get_my_role() = 'CUSTOMER' AND customer_id = auth.uid())
    );

-- =====================================================
-- PHASE 3: UPDATE HELPER FUNCTIONS
-- =====================================================

-- Update get_org_by_manager_phone to use STAFF
DROP FUNCTION IF EXISTS public.get_org_by_manager_phone(TEXT);
CREATE OR REPLACE FUNCTION public.get_org_by_manager_phone(manager_phone TEXT)
RETURNS TABLE(org_id UUID, org_name TEXT, garage_code TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id AS org_id,
        o.name AS org_name,
        o.garage_code
    FROM public.organizations o
    INNER JOIN public.profiles p ON p.org_id = o.id
    WHERE p.phone = manager_phone
      AND p.role = 'SUPER_MANAGER'  -- Only super managers
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update profile elevation check
DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
DROP FUNCTION IF EXISTS public.check_profile_elevation();

CREATE OR REPLACE FUNCTION public.check_profile_elevation() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_role public.user_role;
BEGIN
    SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();

    -- Check if protected fields are being changed
    IF (OLD.role IS DISTINCT FROM NEW.role OR 
        OLD.membership_status IS DISTINCT FROM NEW.membership_status OR
        OLD.org_id IS DISTINCT FROM NEW.org_id) THEN
        
        -- ONLY SUPER_MANAGER can change roles/status/org
        IF current_user_role = 'SUPER_MANAGER' THEN
            RETURN NEW;
        END IF;

        -- ALLOW if CUSTOMER is joining for first time
        IF OLD.org_id IS NULL AND NEW.org_id IS NOT NULL AND 
           OLD.role = 'CUSTOMER' AND NEW.role = 'CUSTOMER' AND
           NEW.membership_status = 'PENDING' THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Unauthorized: Only SUPER_MANAGER can change roles, status, or organization links.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION check_profile_elevation();

-- =====================================================
-- PHASE 4: CLEANUP (Remove old enum values safely)
-- =====================================================

-- Note: Cannot directly remove enum values in PostgreSQL
-- Migration plan:
-- 1. All users are now STAFF (updated in Step 2)
-- 2. Frontend code will be updated to use STAFF
-- 3. In next maintenance window, we can drop/recreate enum if needed

-- Log the migration
INSERT INTO public.audit_logs (action, table_name, changes, created_at)
VALUES (
    'RBAC_SECURITY_FIX',
    'multiple',
    jsonb_build_object(
        'status', 'COMPLETED',
        'migration_date', NOW(),
        'changes', jsonb_build_array(
            'Migrated DEPUTY_MANAGER → STAFF',
            'Migrated TEAM → STAFF',
            'Added IDOR protection',
            'Fixed customer data isolation',
            'Updated RLS policies'
        )
    ),
    NOW()
);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these after migration to verify:

-- 1. Check all users have valid roles
SELECT role, COUNT(*) 
FROM public.profiles 
GROUP BY role;
-- Expected: SUPER_MANAGER, STAFF, CUSTOMER (no DEPUTY_MANAGER or TEAM)

-- 2. Verify policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 3. Test customer isolation (run as customer)
-- Should return ONLY their own tasks:
-- SELECT * FROM tasks WHERE customer_id != auth.uid();  
-- ^ Should be EMPTY

DO $$
BEGIN
    RAISE NOTICE '✅ RBAC Security Fix Applied Successfully!';
    RAISE NOTICE 'Next Step: Update frontend code (types.ts) to use STAFF instead of DEPUTY_MANAGER/TEAM';
END $$;
