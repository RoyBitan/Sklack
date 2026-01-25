-- Fix Tasks RLS for Claiming (v3)
-- Generated manually by Antigravity

-- 0. Ensure helper function exists (from previous migration)
CREATE OR REPLACE FUNCTION public.get_my_org_id_safe()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 1. Create a safe function to check if user is STAFF or MANAGER in their org
CREATE OR REPLACE FUNCTION public.am_i_staff_or_manager_safe()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('SUPER_MANAGER', 'STAFF')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop restrictive policies on tasks if they exist
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.tasks;
DROP POLICY IF EXISTS "Tasks can be updated by org members" ON public.tasks;
DROP POLICY IF EXISTS "Tasks can be updated by assigned staff" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update tasks assigned to them" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updateable by Org Staff" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updateable by Org Staff/Managers" ON public.tasks;

-- 3. Create the new policy allowing specific updates
--    We allow update if:
--    a) User is in the same Org as the Task
--    b) User is STAFF or MANAGER
--    This covers: Claiming (updating assigned_to), Completing, Editing details.
CREATE POLICY "Tasks updateable by Org Staff/Managers" ON public.tasks
FOR UPDATE USING (
  -- Must be in same org
  org_id = get_my_org_id_safe() 
  -- Must be authorized role
  AND am_i_staff_or_manager_safe()
)
WITH CHECK (
  org_id = get_my_org_id_safe() 
  AND am_i_staff_or_manager_safe()
);

-- 4. Ensure Service Role has access
GRANT ALL ON TABLE public.tasks TO service_role;
