-- Fix Employee Task Visibility Issue
-- This script updates the RLS policy to allow employees to update tasks in their organization
-- This is required for the "Start Treatment" button to work (self-assignment)

DROP POLICY IF EXISTS "Tasks manageable by managers and assigned employees" ON tasks;
DROP POLICY IF EXISTS "Tasks manageable by org members" ON tasks;

CREATE POLICY "Tasks manageable by org members" ON tasks
    FOR ALL USING (
        org_id = get_my_org_id() 
        AND (
            -- Managers and Deputies can manage all tasks
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
            OR
            -- Employees can manage tasks in their org (needed for self-assignment)
            get_my_role() = 'EMPLOYEE'
            OR
            -- Users already assigned to a task can manage it
            (auth.uid() = ANY(assigned_to))
        )
    );
