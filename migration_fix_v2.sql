-- Allow EMPLOYEES to manage tasks in their organization
DROP POLICY IF EXISTS "Tasks manageable by managers and assigned employees" ON tasks;

CREATE POLICY "Tasks manageable by org members" ON tasks
    FOR ALL USING (
        org_id = get_my_org_id() 
        AND (
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'EMPLOYEE') 
            OR 
            (auth.uid() = ANY(assigned_to))
        )
    );

-- Add Unique Constraint for License Plates per Organization (to prevent duplicates)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_plate_org_id_key') THEN
        ALTER TABLE vehicles ADD CONSTRAINT vehicles_plate_org_id_key UNIQUE (plate, org_id);
    END IF;
END $$;
