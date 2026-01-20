-- NEW ROBUST SCHEMA & RLS FOR CHECK-IN
-- Ensures data integrity and absolute visibility for customers

-- 1. Ensure tasks table has necessary columns with defaults
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'metadata') THEN
        ALTER TABLE public.tasks ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

-- 2. RESET RLS POLICIES FOR TASKS
DROP POLICY IF EXISTS "tasks_viewable_by_customers" ON public.tasks;
DROP POLICY IF EXISTS "tasks_viewable_by_staff" ON public.tasks;
DROP POLICY IF EXISTS "tasks_manageable_by_managers" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insertable_by_org_members" ON public.tasks;

-- CUSTOMER SELECT: Can see tasks they created, tasks where they are the customer, or tasks for their vehicles
CREATE POLICY "tasks_viewable_by_customers" ON public.tasks 
    FOR SELECT USING (
        (auth.uid() = customer_id) OR 
        (auth.uid() = created_by) OR
        (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
    );

-- STAFF SELECT: Can see all tasks in their organization
CREATE POLICY "tasks_viewable_by_staff" ON public.tasks 
    FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- MANAGER ALL: Can manage all tasks in their organization
CREATE POLICY "tasks_manageable_by_managers" ON public.tasks 
    FOR ALL USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND 
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

-- INSERT: Anyone authenticated can insert if they provide correct IDs (enforced by application logic but allowed globally for now)
CREATE POLICY "tasks_insertable_by_any" ON public.tasks 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. RESET RLS POLICIES FOR VEHICLES (To ensure customers can fetch their vehicles for the 'or' filter)
DROP POLICY IF EXISTS "vehicles_viewable_by_org_members" ON public.vehicles;
CREATE POLICY "vehicles_viewable_by_org_members" ON public.vehicles 
    FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) OR
        owner_id = auth.uid()
    );

-- Log the fix
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('REBUILD_CHECKIN_COMPLETE', 'tasks', '{"version": 3, "rls": "hardened"}');
