-- RUN THIS SCRIPT IN THE SUPABASE SQL EDITOR

-- 1. Create the membership_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE membership_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 2. Add membership_status column to profiles table
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'membership_status') THEN
        ALTER TABLE profiles ADD COLUMN membership_status membership_status DEFAULT 'PENDING';
    END IF;
END $$;

-- 3. Update Profiles Policies (Drop old ones first to be safe, then recreate)
DROP POLICY IF EXISTS "Profiles are viewable by organization members" ON profiles;
DROP POLICY IF EXISTS "Managers can update status" ON profiles;

CREATE POLICY "Profiles are viewable by organization members" ON profiles
    FOR SELECT USING (
        org_id = get_my_org_id() OR 
        (org_id = get_my_org_id() AND membership_status = 'PENDING')
    );

CREATE POLICY "Managers can update status" ON profiles
    FOR UPDATE USING (
        org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

-- 4. Update Vehicles Policies (Drop potential conflicts)
DROP POLICY IF EXISTS "Users can manage their own vehicles" ON vehicles;

CREATE POLICY "Users can manage their own vehicles" ON vehicles
    FOR ALL USING (owner_id = auth.uid());

-- 9. Update Tasks Policies (for privacy)
DROP POLICY IF EXISTS "Tasks viewable by org members" ON tasks;

CREATE POLICY "Tasks viewable by org members" ON tasks
    FOR SELECT USING (
        org_id = get_my_org_id() 
        AND (
            -- Managers, Deputies, and Employees can see all tasks in the org
            get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'EMPLOYEE') 
            OR 
            -- Customers can ONLY see tasks linked to their own vehicle or where they are the customer
            (
                get_my_role() = 'CUSTOMER' 
                AND (
                    customer_id = auth.uid() 
                    OR 
                    vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())
                )
            )
        )
    );
