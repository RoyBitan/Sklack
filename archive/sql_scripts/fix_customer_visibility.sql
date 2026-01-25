-- Allow customers to view their own tasks regardless of organization status
DROP POLICY IF EXISTS "tasks_viewable_by_customers" ON public.tasks;

CREATE POLICY "tasks_viewable_by_customers" ON public.tasks 
    FOR SELECT USING (
        (auth.uid() = customer_id) OR 
        (auth.uid() = created_by) OR
        (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
    );
