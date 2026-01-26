-- Update policy for staff task visibility based on assignment
DROP POLICY IF EXISTS "tasks_viewable_by_staff" ON public.tasks;

CREATE POLICY "tasks_viewable_by_staff" ON public.tasks 
    FOR SELECT USING (
        org_id = get_my_org_id() AND (
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER') OR -- Managers see everything
            (COALESCE(cardinality(assigned_to), 0) = 0) OR          -- Everyone sees global tasks
            (auth.uid() = ANY(assigned_to))                        -- Only assigned staff see targeted tasks
        )
    );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
