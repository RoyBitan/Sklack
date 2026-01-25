-- Robust fix for customer task visibility
-- Ensures customers can see tasks they created OR tasks where they are the customer_id
-- OR tasks related to vehicles they own.

-- 1. Drop existing policy
DROP POLICY IF EXISTS "tasks_viewable_by_customers" ON public.tasks;

-- 2. Create optimized policy
CREATE POLICY "tasks_viewable_by_customers" ON public.tasks 
    FOR SELECT USING (
        (auth.uid() = customer_id) OR 
        (auth.uid() = created_by) OR
        (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
    );

-- 3. Also ensure appointments are viewable by those who created them
DROP POLICY IF EXISTS "appointments_viewable_by_members" ON public.appointments;
CREATE POLICY "appointments_viewable_by_members" ON public.appointments 
    FOR SELECT USING (
        org_id = get_my_org_id() OR 
        customer_id = auth.uid() OR
        auth.uid() = (SELECT owner_id FROM vehicles WHERE id = vehicle_id)
    );

-- Log the fix
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('APPLY_RLS_FIX', 'tasks', '{"policy": "tasks_viewable_by_customers", "v": 2}');
