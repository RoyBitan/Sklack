-- Migration: Robust Linking Logic (Phone/ID/Email/Plate)

-- 1. Add national_id to profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'national_id') THEN
        ALTER TABLE profiles ADD COLUMN national_id TEXT;
    END IF;
END $$;

-- 2. Add Unique Constraints (Safely)
DO $$ BEGIN
    -- Phone Unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
        -- Check if duplicates exist first? If so, we might fail. 
        -- For this migration, we assume data is clean or we accept failure if dirty.
        -- We try to add the constraint.
        BEGIN
            ALTER TABLE profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Constraint profiles_phone_key already exists or data prevents it';
            -- Ideally we would clean data here if this was a prod script manual run
        END;
    END IF;

    -- National ID Unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_national_id_key') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_national_id_key UNIQUE (national_id);
    END IF;
END $$;


-- 3. RPC: Get Vehicles by Phone (Magic Fetch)
-- Returns vehicles linked to a user found by this phone number.
-- SECURITY: 
-- A. We need to find the user ID from the phone (Profiles table).
-- B. Then find vehicles owned by that user ID.
-- C. FILTER: Only return vehicles relevant to the calling admin/user?
-- For "Admin creates task", the admin needs to see vehicles even if they are not yet in the org? 
-- The user requirement: "lookup all vehicles associated with that phone number... Select one".
-- If the vehicle is in another org, can we select it?
-- Logic: If I select a vehicle from another org, I effectively "bring it" to my org (create a local link?).
-- Schema: Vehicles have `org_id`.
-- Suggestion: We return the vehicle details. If the Admin selects it, we probably need to create a NEW vehicle record in the current org
-- OR update the existing one? (No, vehicle shouldn't move orgs if it's data siloed).
-- Or we copy the details (Model, Year, Plate) to the form.
-- Let's return the vehicle data.

CREATE OR REPLACE FUNCTION get_vehicles_by_phone(phone_text TEXT)
RETURNS TABLE (
    id UUID,
    plate TEXT,
    model TEXT,
    year TEXT,
    color TEXT,
    org_id UUID  -- Return org_id to know if it's internal or external
) 
SECURITY DEFINER -- Bypass RLS to search global profiles/vehicles
AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.plate, v.model, v.year, v.color, v.org_id
    FROM vehicles v
    JOIN profiles p ON v.owner_id = p.id
    WHERE p.phone = phone_text;
END;
$$ LANGUAGE plpgsql;


-- 4. RPC: Get Org by Manager Phone (Reverse Lookup)
-- Allows a user to find an Org ID by typing the Manager's phone number.
CREATE OR REPLACE FUNCTION get_org_by_manager_phone(phone_text TEXT)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.name
    FROM organizations o
    JOIN profiles p ON p.org_id = o.id
    WHERE p.phone = phone_text 
    AND p.role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER');
END;
$$ LANGUAGE plpgsql;

