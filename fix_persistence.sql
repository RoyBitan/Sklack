-- ==========================================
-- FIX: Task Assignment Persistence (RLS)
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Drop the restrictive update policy that prevents workers from claiming tasks
DROP POLICY IF EXISTS "tasks_updatable_by_assigned_staff" ON public.tasks;

-- 2. Create a broader update policy for all staff members in the organization
-- This allows TEAM members to update any task in their org (necessary for claiming unassigned tasks)
CREATE POLICY "tasks_updatable_by_staff" ON public.tasks 
    FOR UPDATE USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND 
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM')
    );

-- 3. Ensure INSERT is allowed for all authenticated users (required for customer check-ins)
-- Note: 'tasks_insertable_by_any' might already exist from previous migrations
DROP POLICY IF EXISTS "tasks_insertable_by_any" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insertable_by_authenticated" ON public.tasks;
CREATE POLICY "tasks_insertable_by_authenticated" ON public.tasks 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Ensure Managers have full control
DROP POLICY IF EXISTS "tasks_manageable_by_managers" ON public.tasks;
CREATE POLICY "tasks_manageable_by_managers" ON public.tasks 
    FOR ALL USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()) AND 
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

-- Log the fix
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('FIX_RLS_PERSISTENCE', 'tasks', '{"description": "Broadened staff update policy to allow task claiming"}');
