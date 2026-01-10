-- Sklack Production Database Schema
-- Multi-tenant Garage Management System

-- 1. ENUMS (Idempotent creation)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'EMPLOYEE', 'CUSTOMER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CUSTOMER_APPROVAL', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE membership_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 2. TABLES

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id),
    full_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'CUSTOMER',
    membership_status membership_status DEFAULT 'PENDING',
    phone TEXT,
    notification_settings JSONB DEFAULT '{"vibrate": true, "sound": "default", "events": ["TASK_CREATED", "TASK_CLAIMED", "TASK_COMPLETED"]}'::JSONB,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES profiles(id),
    plate TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id),
    customer_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'WAITING',
    priority priority_level DEFAULT 'NORMAL',
    assigned_to UUID[] DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    allotted_time INTEGER, -- in minutes
    price DECIMAL(10,2),
    vehicle_year TEXT,
    immobilizer_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id),
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status DEFAULT 'PENDING',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCTIONS & HELPERS (Bypass RLS for policy definitions)

-- Function to get the current user's org_id without recursion
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get the current user's role without recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. RLS POLICIES (Row Level Security)

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to drop existing policies to avoid duplicates
DO $$ BEGIN
    DROP POLICY IF EXISTS "Organizations are viewable by members" ON organizations;
    DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
    DROP POLICY IF EXISTS "Managers can update their organization" ON organizations;
    DROP POLICY IF EXISTS "Profiles are viewable by self" ON profiles;
    DROP POLICY IF EXISTS "Profiles are viewable by organization members" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    DROP POLICY IF EXISTS "Vehicles viewable by org members" ON vehicles;
    DROP POLICY IF EXISTS "Managers can manage vehicles" ON vehicles;
    DROP POLICY IF EXISTS "Tasks viewable by org members" ON tasks;
    DROP POLICY IF EXISTS "Tasks manageable by managers and assigned employees" ON tasks;
    DROP POLICY IF EXISTS "Appointments viewable by org members and owner" ON appointments;
    DROP POLICY IF EXISTS "Users can create appointments" ON appointments;
END $$;

-- Organizations Policies
-- Allow authenticated users to see organizations so they can create/join them.
CREATE POLICY "Organizations are viewable by members" ON organizations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Managers can update their organization" ON organizations
    FOR UPDATE USING (
        id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

-- Profiles Policies
CREATE POLICY "Profiles are viewable by self" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles are viewable by organization members" ON profiles
    FOR SELECT USING (
        org_id = get_my_org_id() OR 
        (org_id = get_my_org_id() AND membership_status = 'PENDING')
    );
    
CREATE POLICY "Managers can update status" ON profiles
    FOR UPDATE USING (
        org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Vehicles Policies
CREATE POLICY "Vehicles viewable by org members" ON vehicles
    FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "Managers can manage vehicles" ON vehicles
    FOR ALL USING (
        org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

CREATE POLICY "Users can manage their own vehicles" ON vehicles
    FOR ALL USING (owner_id = auth.uid());

-- Tasks Policies
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

CREATE POLICY "Tasks manageable by managers and assigned employees" ON tasks
    FOR ALL USING (
        org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER') OR
        (auth.uid() = ANY(assigned_to))
    );

-- Appointments Policy
CREATE POLICY "Appointments viewable by org members and owner" ON appointments
    FOR SELECT USING (
        org_id = get_my_org_id() OR customer_id = auth.uid()
    );

CREATE POLICY "Users can create appointments" ON appointments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
        CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vehicles_updated_at') THEN
        CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at') THEN
        CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- 6. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'),
    'CUSTOMER'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
