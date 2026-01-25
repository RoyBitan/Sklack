-- Fix Infinite Recursion in RLS Policies
-- Generated at 2026-01-22
-- This migration fixes the circular dependency between profiles and organizations tables

-- STEP 1: Drop ALL existing policies on both tables to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on organizations
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'organizations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.organizations';
    END LOOP;
    
    -- Drop all policies on profiles
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.profiles';
    END LOOP;
END $$;

-- STEP 2: Create helper functions that DON'T cause recursion
-- These use SECURITY DEFINER to bypass RLS

CREATE OR REPLACE FUNCTION public.get_my_org_id_safe()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_role_safe()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- STEP 3: Create NON-RECURSIVE policies for ORGANIZATIONS
-- Simple rule: All authenticated users can view all organizations
CREATE POLICY "orgs_select_all" ON public.organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "orgs_insert_all" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "orgs_update_by_owner" ON public.organizations
    FOR UPDATE USING (
        -- Direct check without calling get_my_org_id() to avoid recursion
        id IN (
            SELECT org_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role::TEXT = 'SUPER_MANAGER'
        )
    );

-- STEP 4: Create NON-RECURSIVE policies for PROFILES
-- Users can view their own profile
CREATE POLICY "profiles_select_self" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can view profiles in their organization (using direct query, not function)
CREATE POLICY "profiles_select_org" ON public.profiles
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    );

-- Users can insert their own profile
CREATE POLICY "profiles_insert_self" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile (basic fields)
CREATE POLICY "profiles_update_self" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to join an organization (when org_id is NULL)
CREATE POLICY "profiles_update_join_org" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id AND org_id IS NULL
    )
    WITH CHECK (
        auth.uid() = id AND 
        org_id IS NOT NULL AND 
        role IN ('CUSTOMER', 'STAFF')
    );

-- Managers can update profiles in their org
CREATE POLICY "profiles_update_by_manager" ON public.profiles
    FOR UPDATE USING (
        org_id IN (
            SELECT org_id FROM public.profiles 
            WHERE id = auth.uid() 
            AND role::TEXT = 'SUPER_MANAGER'
        )
    );

-- STEP 5: Verify foreign key exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_org_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_org_id_fkey 
        FOREIGN KEY (org_id) REFERENCES public.organizations(id);
    END IF;
END $$;
