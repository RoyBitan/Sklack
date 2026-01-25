-- Fix Vehicle Visibility (RLS & CRUD)
-- Generated at 2026-01-21

-- 1. DROP Existing Vehicle Policies to start fresh (avoids conflicts)
DROP POLICY IF EXISTS "vehicles_viewable_by_org_members" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_manageable_by_owners" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_manageable_by_managers" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insertable_by_org_members" ON public.vehicles;

-- 2. CREATE Unified Select Policy
--    "Staff/Managers see ALL in org, Customers see OWN vehicles"
CREATE POLICY "vehicles_select_policy" ON public.vehicles 
    FOR SELECT USING (
        (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF')) OR
        (auth.uid() = owner_id)
    );

-- 3. CREATE Insert Policy
--    "Anyone in the org (Staff/Manager) can add vehicles.
--     Customers can add vehicles ONLY if they assign it to themselves."
CREATE POLICY "vehicles_insert_policy" ON public.vehicles 
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND (
            get_my_role() IN ('SUPER_MANAGER', 'STAFF') OR
            (get_my_role() = 'CUSTOMER' AND owner_id = auth.uid())
        )
    );

-- 4. CREATE Update/Delete Policy
--    "Managers/Staff can edit any vehicle in org.
--     Customers can edit ONLY their own."
CREATE POLICY "vehicles_update_delete_policy" ON public.vehicles 
    FOR ALL USING (
        (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'STAFF')) OR
        (auth.uid() = owner_id)
    );

-- 5. Fix Potential Orphaned Vehicles
--    Ensure all vehicles have an org_id (This might not catch rows already inserted with null, but prevents future issues via trigger if we wanted strictness, but RLS covers it above).
--    (No SQL action needed here, handled by frontend logic passing org_id).
