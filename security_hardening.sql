-- =====================================================
-- SKLACK RLS HARDENING & SECURITY AUDIT FIXES
-- Date: 2026-01-18
-- =====================================================

-- 1. HARDEN PROFILES: Prevent unauthorized role or status changes
-- Current policy "profiles_updatable_by_self" allows changing any column.
DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE OR REPLACE FUNCTION public.check_profile_elevation() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_role public.user_role;
BEGIN
    -- Get the role of the person performing the update
    SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();

    -- Check if protected fields are being changed
    IF (OLD.role IS DISTINCT FROM NEW.role OR 
        OLD.membership_status IS DISTINCT FROM NEW.membership_status OR
        OLD.org_id IS DISTINCT FROM NEW.org_id) THEN
        
        -- ALLOW if user is a Manager
        IF current_user_role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER') THEN
            RETURN NEW;
        END IF;

        -- ALLOW if a CUSTOMER is setting their org_id for the first time (Joining)
        IF OLD.org_id IS NULL AND NEW.org_id IS NOT NULL AND OLD.role = 'CUSTOMER' AND NEW.role = 'CUSTOMER' THEN
            -- Ensure they are setting their status to PENDING
            IF NEW.membership_status = 'PENDING' THEN
                RETURN NEW;
            END IF;
        END IF;

        RAISE EXCEPTION 'Unauthorized: Only managers can change roles, status, or organization links.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION check_profile_elevation();


-- 2. HARDEN TASKS: Ensure data integrity on insertion
-- Customers should only create tasks for themselves.
DROP POLICY IF EXISTS "tasks_insertable_by_org_members" ON public.tasks;
CREATE POLICY "tasks_insertable_by_org_members" ON public.tasks 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND (
            -- Role is Manager/Staff
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM') OR
            -- OR Role is Customer and they are setting themselves as the owner/creator
            (get_my_role() = 'CUSTOMER' AND (customer_id = auth.uid() OR created_by = auth.uid()))
        )
    );


-- 3. HARDEN VEHICLES: Ensure owners can only add vehicles to their own account
DROP POLICY IF EXISTS "vehicles_manageable_by_owners" ON public.vehicles;
CREATE POLICY "vehicles_manageable_by_owners" ON public.vehicles 
    FOR ALL USING (owner_id = auth.uid())
    WITH CHECK (
        owner_id = auth.uid() AND 
        org_id = get_my_org_id() -- Must belong to the user's current organization
    );


-- 4. HARDEN APPOINTMENTS: Ensure organization scoping
DROP POLICY IF EXISTS "appointments_insertable_by_authenticated" ON public.appointments;
CREATE POLICY "appointments_insertable_by_org_members" ON public.appointments 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND (
            customer_id = auth.uid() OR 
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM')
        )
    );


-- 5. NOTIFICATIONS: Prevent spoofing the 'actor_id'
DROP POLICY IF EXISTS "notifications_insertable_by_org_members" ON public.notifications;
CREATE POLICY "notifications_insertable_by_org_members" ON public.notifications 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND 
        (actor_id = auth.uid() OR actor_id IS NULL) -- Cannot impersonate others
    );


-- 6. AUDIT THE AUDIT: Ensure audit logs are absolutely read-only for managers
-- No UPDATE or DELETE allowed for anyone.
DROP POLICY IF EXISTS "audit_logs_viewable_by_managers" ON public.audit_logs;
CREATE POLICY "audit_logs_viewable_by_managers" ON public.audit_logs 
    FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));


-- Log the audit completion
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('SECURITY_AUDIT_HARDEING', 'multiple', '{"status": "COMPLETED", "version": "1.1"}');
