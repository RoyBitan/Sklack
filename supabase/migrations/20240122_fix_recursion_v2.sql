-- Fix Infinite Recursion in RLS Policies (Final)
-- Generated at 2026-01-22 17:55:00
-- This migration fixes the circular dependency between profiles and organizations tables by correctly utilizing SECURITY DEFINER functions.

-- STEP 1: Define the SECURITY DEFINER function to break recursion
-- This function runs with the privileges of the creator (admin), bypassing RLS on the profiles table.
CREATE OR REPLACE FUNCTION public.get_my_org_id_safe()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- STEP 2: Drop the problematic recursive policies
DROP POLICY IF EXISTS "profiles_select_org" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_by_manager" ON public.profiles;

-- STEP 3: Re-create policies using the safe function

-- FIX: Use the function instead of the subquery for SELECT
CREATE POLICY "profiles_select_org" ON public.profiles
    FOR SELECT USING (
        org_id = get_my_org_id_safe()
    );

-- FIX: Use the function for Manager Updates as well
-- We also need a safe way to check role without recursion
CREATE OR REPLACE FUNCTION public.am_i_manager_safe()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role::TEXT = 'SUPER_MANAGER'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE POLICY "profiles_update_by_manager" ON public.profiles
    FOR UPDATE USING (
        am_i_manager_safe() AND org_id = get_my_org_id_safe()
    );
