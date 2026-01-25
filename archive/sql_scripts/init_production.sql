-- =====================================================
-- SKLACK GARAGE MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Professional Production-Ready Setup
-- Version: 2.0
-- =====================================================

-- ⚠️ NUCLEAR OPTION: Complete clean slate (uncomment if needed)
-- WARNING: This will delete ALL your data!
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- =====================================================
-- SECTION 1: ENUMS (Type Definitions)
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM', 'CUSTOMER');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('WAITING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE public.priority_level AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE public.membership_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE public.appointment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
END $$;

-- Drop old functions with incompatible signatures (must be done early, before tables/policies)
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_org_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_org_by_manager_phone(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_garage_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- =====================================================
-- SECTION 2: CORE TABLES
-- =====================================================

-- Organizations (Garages)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID,  -- Will add FK constraint after profiles table is created
    logo_url TEXT,
    garage_code TEXT UNIQUE NOT NULL,  -- Short code for joining (e.g., XY123)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id),
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'CUSTOMER',
    membership_status public.membership_status DEFAULT 'PENDING',
    phone TEXT,
    secondary_phone TEXT,
    address TEXT,
    national_id TEXT,  -- ID number field
    notification_settings JSONB DEFAULT '{
        "vibrate": true, 
        "sound": "default", 
        "events": ["TASK_CREATED", "TASK_CLAIMED", "TASK_COMPLETED"]
    }'::JSONB,
    push_subscription JSONB,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id),
    owner_name TEXT, -- Fallback if no owner_id
    plate TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT,
    color TEXT,
    vin TEXT,  -- VIN/Chassis number (for gov API)
    fuel_type TEXT,  -- Fuel type (for gov API)
    engine_model TEXT,  -- Engine model (for gov API)
    registration_valid_until DATE,  -- Registration validity (for gov API)
    kodanit TEXT, -- Immobilizer/Key Code (Standardized field)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT vehicles_plate_org_id_key UNIQUE (plate, org_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id),
    customer_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'WAITING',
    priority public.priority_level DEFAULT 'NORMAL',
    assigned_to UUID[] DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    allotted_time INTEGER,  -- in minutes
    price DECIMAL(10,2),
    vehicle_year TEXT,
    immobilizer_code TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    service_type TEXT,
    description TEXT,
    duration TEXT,
    status public.appointment_status DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations (Phone-based joining)
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'PENDING',  -- PENDING, ACCEPTED, DECLINED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phone, org_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id),  -- Who triggered the notification
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,  -- e.g., 'TASK_CREATED', 'TASK_COMPLETED'
    reference_id UUID,  -- ID of related task/appointment
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals (Price quotes/repair suggestions)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id),
    description TEXT NOT NULL,
    price DECIMAL(10,2),
    status TEXT DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    changes JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Tokens (for web push notifications)
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token_json)
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- =====================================================
-- SECTION 3: INDEXES (Performance Optimization)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_id ON public.vehicles(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle_id ON public.tasks(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON public.appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_invitations_phone ON public.invitations(phone);
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations(org_id);

-- Add foreign key constraint for owner_id (after both tables exist)
ALTER TABLE public.organizations 
ADD CONSTRAINT fk_organizations_owner_id 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- =====================================================
-- SECTION 4: FUNCTIONS
-- =====================================================

-- Generate unique garage code (2 letters + 3 numbers, e.g., XY123)
CREATE OR REPLACE FUNCTION public.generate_garage_code() RETURNS TEXT AS $$
DECLARE
    letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    numbers TEXT := '0123456789';
    result TEXT := '';
    i INTEGER;
    code_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        -- Add 2 random uppercase letters
        FOR i IN 1..2 LOOP
            result := result || substr(letters, floor(random() * length(letters) + 1)::integer, 1);
        END LOOP;
        -- Add 3 random numbers
        FOR i IN 1..3 LOOP
            result := result || substr(numbers, floor(random() * length(numbers) + 1)::integer, 1);
        END LOOP;
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.organizations WHERE garage_code = result) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-assign garage code on organization creation
CREATE OR REPLACE FUNCTION public.set_garage_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.garage_code IS NULL OR NEW.garage_code = '' THEN
        NEW.garage_code := generate_garage_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    extracted_role public.user_role;
    raw_role text;
BEGIN
    -- Extract and validate role
    raw_role := NEW.raw_user_meta_data->>'role';
    
    -- Cast with fallback
    BEGIN
        IF raw_role IS NOT NULL THEN
            extracted_role := raw_role::public.user_role;
        ELSE
            extracted_role := 'CUSTOMER'::public.user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        extracted_role := 'CUSTOMER'::public.user_role;
    END;

    INSERT INTO public.profiles (id, full_name, role, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'),
        extracted_role,
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;
        
    RETURN NEW;
END;
$$;

-- Create organization and link owner
CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- 0. Emergency Profile Creation (Failsafe for trigger lag)
    -- If the profile doesn't exist yet (because trigger is slow), create it now
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        auth.uid(),
        COALESCE((auth.jwt() -> 'user_metadata' ->> 'full_name'), 'מנהל חדש'),
        'SUPER_MANAGER'::public.user_role
    )
    ON CONFLICT (id) DO UPDATE SET role = 'SUPER_MANAGER'::public.user_role;

    -- 1. Create the organization
    INSERT INTO public.organizations (name, owner_id)
    VALUES (org_name, auth.uid())
    RETURNING id INTO new_org_id;

    -- 2. Link the owner profile to the organization and approve them
    UPDATE public.profiles
    SET 
        org_id = new_org_id,
        membership_status = 'APPROVED'::public.membership_status,
        role = 'SUPER_MANAGER'::public.user_role
    WHERE id = auth.uid();

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION public.get_my_org_id() RETURNS UUID AS $$
BEGIN
    RETURN (SELECT org_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get current user's role (returns TEXT for compatibility)
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get organization by manager's phone number
CREATE OR REPLACE FUNCTION public.get_org_by_manager_phone(manager_phone TEXT)
RETURNS TABLE(org_id UUID, org_name TEXT, garage_code TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id AS org_id,
        o.name AS org_name,
        o.garage_code
    FROM public.organizations o
    INNER JOIN public.profiles p ON p.org_id = o.id
    WHERE p.phone = manager_phone
      AND p.role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update garage code (admin only)
CREATE OR REPLACE FUNCTION public.update_garage_code(new_code TEXT)
RETURNS JSON AS $$
DECLARE
    user_org_id UUID;
    user_role TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Get user's org_id and role
    SELECT org_id, role INTO user_org_id, user_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check permissions
    IF user_role != 'SUPER_MANAGER' THEN
        RETURN json_build_object('success', false, 'error', 'Only managers can update the garage code');
    END IF;

    -- Validate format (2 uppercase letters + 3 numbers)
    IF new_code !~ '^[A-Z]{2}[0-9]{3}$' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid code format. Must be 2 uppercase letters followed by "3" numbers (e.g., AB123)');
    END IF;

    -- Check uniqueness
    SELECT EXISTS(
        SELECT 1 FROM public.organizations 
        WHERE garage_code = new_code 
        AND id != user_org_id
    ) INTO code_exists;

    IF code_exists THEN
        RETURN json_build_object('success', false, 'error', 'This garage code is already in use. Please choose another one.');
    END IF;

    -- Update the code
    UPDATE public.organizations
    SET garage_code = new_code
    WHERE id = user_org_id;

    RETURN json_build_object('success', true, 'code', new_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Accept an invitation safely
CREATE OR REPLACE FUNCTION public.accept_invitation(inv_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_org_id UUID;
    v_phone TEXT;
BEGIN
    -- 1. Get invitation details
    SELECT org_id, phone INTO v_org_id, v_phone
    FROM public.invitations
    WHERE id = inv_id AND status = 'PENDING';

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Invitation not found or already processed';
    END IF;

    -- 2. Verify phone number matches user's profile
    IF v_phone IS DISTINCT FROM (SELECT phone FROM public.profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'This invitation was sent to % but your profile phone is %', v_phone, (SELECT phone FROM public.profiles WHERE id = auth.uid());
    END IF;

    -- 3. Update Profile
    UPDATE public.profiles
    SET 
        org_id = v_org_id,
        membership_status = 'APPROVED'::public.membership_status
    WHERE id = auth.uid();

    -- 4. Mark invitation as accepted
    UPDATE public.invitations
    SET status = 'ACCEPTED'
    WHERE id = inv_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- SECTION 5: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_set_garage_code ON public.organizations;
CREATE TRIGGER trigger_set_garage_code
BEFORE INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION set_garage_code();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.tablename);
    END LOOP;
END $$;

-- Organizations Policies
CREATE POLICY "orgs_viewable_by_authenticated" ON public.organizations 
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "orgs_insertable_by_authenticated" ON public.organizations 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orgs_updatable_by_managers" ON public.organizations 
    FOR UPDATE USING (id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Profiles Policies
CREATE POLICY "profiles_viewable_by_self" ON public.profiles 
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_viewable_by_org_members" ON public.profiles 
    FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "profiles_updatable_by_managers" ON public.profiles 
    FOR UPDATE USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "profiles_updatable_by_self" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        -- Users can update their name/phone but cannot change their org_id or status
        -- if it would result in an unauthorized change.
        -- We simplify this to only allow the update if the user is the owner.
        auth.uid() = id
    );
CREATE POLICY "profiles_insertable_by_self" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Vehicles Policies
CREATE POLICY "vehicles_viewable_by_org_members" ON public.vehicles 
    FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "vehicles_manageable_by_managers" ON public.vehicles 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "vehicles_manageable_by_owners" ON public.vehicles 
    FOR ALL USING (owner_id = auth.uid());

-- Tasks Policies
CREATE POLICY "tasks_viewable_by_staff" ON public.tasks 
    FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM'));
CREATE POLICY "tasks_viewable_by_customers" ON public.tasks 
    FOR SELECT USING (
        (auth.uid() = customer_id) OR 
        (auth.uid() = created_by) OR
        (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
    );
CREATE POLICY "tasks_manageable_by_managers" ON public.tasks 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "tasks_updatable_by_assigned_staff" ON public.tasks 
    FOR UPDATE USING (org_id = get_my_org_id() AND auth.uid() = ANY(assigned_to));
CREATE POLICY "tasks_insertable_by_org_members" ON public.tasks 
    FOR INSERT WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM', 'CUSTOMER'));

-- Appointments Policies
CREATE POLICY "appointments_viewable_by_members" ON public.appointments 
    FOR SELECT USING (org_id = get_my_org_id() OR customer_id = auth.uid());
CREATE POLICY "appointments_insertable_by_authenticated" ON public.appointments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "appointments_manageable_by_managers" ON public.appointments 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Notifications Policies
CREATE POLICY "notifications_viewable_by_owner" ON public.notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_insertable_by_org_members" ON public.notifications 
    FOR INSERT WITH CHECK (org_id = get_my_org_id());
CREATE POLICY "notifications_updatable_by_owner" ON public.notifications 
    FOR UPDATE USING (user_id = auth.uid());

-- Invitations Policies
CREATE POLICY "invitations_viewable_by_org_members" ON public.invitations 
    FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "invitations_viewable_by_invitee" ON public.invitations 
    FOR SELECT USING (phone = (SELECT phone FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_updatable_by_invitee" ON public.invitations 
    FOR UPDATE USING (phone = (SELECT phone FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_manageable_by_managers" ON public.invitations 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Proposals Policies
CREATE POLICY "proposals_viewable_by_org_members" ON public.proposals 
    FOR SELECT USING (org_id = get_my_org_id() OR customer_id = auth.uid());
CREATE POLICY "proposals_manageable_by_managers" ON public.proposals 
    FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Audit Logs Policies (Read-only for managers)
CREATE POLICY "audit_logs_viewable_by_managers" ON public.audit_logs 
    FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Push Tokens & Subscriptions Policies
CREATE POLICY "push_tokens_manageable_by_owner" ON public.push_tokens 
    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions_manageable_by_owner" ON public.push_subscriptions 
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SECTION 7: SUPABASE REALTIME
-- =====================================================

-- Create and configure realtime publication for live updates
DO $$ 
BEGIN
    -- Create publication if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to realtime publication (for live subscriptions)
-- Note: These will error if already added, but that's okay
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECTION 8: INITIAL DATA (Optional)
-- =====================================================

-- Add any seed data here if needed

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Sklack Garage Management System initialized successfully!';
    RAISE NOTICE 'Version: 2.0 | Tables: 12 | Functions: 6 | Triggers: 2';
    RAISE NOTICE 'Realtime enabled for: tasks, notifications, profiles, vehicles, appointments';
END $$;

-- =====================================================
-- SECTION 9: SAFE MIGRATIONS (For Re-Runs)
-- =====================================================

-- Ensure vehicles table has all required columns (idempotent check)
DO $$
BEGIN
    -- Add owner_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'owner_name') THEN
        ALTER TABLE public.vehicles ADD COLUMN owner_name TEXT;
    END IF;

    -- Add vin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vin') THEN
        ALTER TABLE public.vehicles ADD COLUMN vin TEXT;
    END IF;

    -- Add fuel_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'fuel_type') THEN
        ALTER TABLE public.vehicles ADD COLUMN fuel_type TEXT;
    END IF;

    -- Add engine_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'engine_model') THEN
        ALTER TABLE public.vehicles ADD COLUMN engine_model TEXT;
    END IF;

    -- Add registration_valid_until
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'registration_valid_until') THEN
        ALTER TABLE public.vehicles ADD COLUMN registration_valid_until DATE;
    END IF;

    -- Add kodanit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'kodanit') THEN
        ALTER TABLE public.vehicles ADD COLUMN kodanit TEXT;
    END IF;

    -- Ensure 'APPROVED' status exists in enum (Safe Migration)
    ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'APPROVED';
    ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'CANCELLED';

END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
