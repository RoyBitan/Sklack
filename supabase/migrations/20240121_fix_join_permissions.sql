-- Fix for "Unauthorized: Only SUPER_MANAGERS can change roles" on Join
-- Generated at 2026-01-21

-- 1. Update the Trigger Logic (check_profile_elevation)
--    Allow users to set their org_id and role if they are currently unassigned.
CREATE OR REPLACE FUNCTION public.check_profile_elevation() 
RETURNS TRIGGER AS $$
DECLARE
    current_user_role public.user_role;
BEGIN
    SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();

    -- Check if protected fields are being changed
    IF (OLD.role IS DISTINCT FROM NEW.role OR 
        OLD.membership_status IS DISTINCT FROM NEW.membership_status OR
        OLD.org_id IS DISTINCT FROM NEW.org_id) THEN
        
        -- 1. SUPER_MANAGER can do anything
        IF current_user_role = 'SUPER_MANAGER' THEN
            RETURN NEW;
        END IF;

        -- 2. ALLOW joining a garage (Update from NULL org to a specific org)
        --    Users can set themselves to CUSTOMER or STAFF when joining.
        --    They CANNOT set themselves to SUPER_MANAGER.
        IF OLD.org_id IS NULL AND NEW.org_id IS NOT NULL THEN
            IF NEW.role IN ('CUSTOMER', 'STAFF') THEN
                 RETURN NEW;
            ELSE
                 RAISE EXCEPTION 'Unauthorized: Cannot join directly as a MANAGER.';
            END IF;
        END IF;

        -- 3. If standard update, logic falls through to exception
        RAISE EXCEPTION 'Unauthorized: Only SUPER_MANAGER can change roles, status, or organization links.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Add RLS Policy to allow self-update during join
--    Existing policies only allow Managers to update profiles.
--    We need a policy for the User to update their own profile when org_id is NULL.

DROP POLICY IF EXISTS "allow_users_to_join_org" ON public.profiles;

CREATE POLICY "allow_users_to_join_org" ON public.profiles
FOR UPDATE USING (
  -- Can only update self, and only if currently not in an org
  auth.uid() = id AND org_id IS NULL
)
WITH CHECK (
  -- Can only set org_id (not null), and role must be safe
  auth.uid() = id AND 
  org_id IS NOT NULL AND 
  role IN ('CUSTOMER', 'STAFF')
);

-- 3. Security Hardening for any existing Join RPCs (if they exist)
--    We attempt to update a common function name if it exists, otherwise this block does nothing harmful.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'join_garage_by_code') THEN
        ALTER FUNCTION public.join_garage_by_code(text) SECURITY DEFINER;
    END IF;
END $$;
