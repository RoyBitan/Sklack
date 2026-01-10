-- Sklack Production Database Initialization (Consolidated v1)
-- This script represents the complete, production-ready schema.

-- 1. ENUMS (Idempotent creation in public schema)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM', 'CUSTOMER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('WAITING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CUSTOMER_APPROVAL', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE public.priority_level AS ENUM ('NORMAL', 'URGENT', 'CRITICAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE public.appointment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
        CREATE TYPE public.membership_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- 2. TABLES

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id),
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'CUSTOMER',
    membership_status public.membership_status DEFAULT 'PENDING',
    phone TEXT,
    notification_settings JSONB DEFAULT '{"vibrate": true, "sound": "default", "events": ["TASK_CREATED", "TASK_CLAIMED", "TASK_COMPLETED"]}'::JSONB,
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
    plate TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure plate is unique per organization
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
    allotted_time INTEGER, -- in minutes
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
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status public.appointment_status DEFAULT 'PENDING',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY DEFINER HELPERS (With search_path = public)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID 
LANGUAGE sql 
STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role 
LANGUAGE sql 
STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. RLS POLICIES

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Cleanup existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.tablename);
    END LOOP;
END $$;

-- Organizations
CREATE POLICY "Orgs viewable by authenticated" ON public.organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Orgs insertable by authenticated" ON public.organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Managers update orgs" ON public.organizations FOR UPDATE USING (id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));

-- Profiles
CREATE POLICY "Profiles viewable by self" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles viewable by org members" ON public.profiles FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "Profiles update status by managers" ON public.profiles FOR UPDATE USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "Profiles update self" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insert self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Vehicles
CREATE POLICY "Vehicles viewable by org members" ON public.vehicles FOR SELECT USING (org_id = get_my_org_id());
CREATE POLICY "Vehicles manageable by managers" ON public.vehicles FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "Vehicles manageable by owners" ON public.vehicles FOR ALL USING (owner_id = auth.uid());

-- Tasks
CREATE POLICY "Tasks viewable by staff" ON public.tasks FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM'));
CREATE POLICY "Tasks viewable by customers" ON public.tasks FOR SELECT USING (org_id = get_my_org_id() AND get_my_role() = 'CUSTOMER' AND (customer_id = auth.uid() OR vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid())));
CREATE POLICY "Tasks manageable by managers" ON public.tasks FOR ALL USING (org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER'));
CREATE POLICY "Tasks manageable by assigned staff" ON public.tasks FOR UPDATE USING (org_id = get_my_org_id() AND auth.uid() = ANY(assigned_to));
CREATE POLICY "Tasks insertable by authenticated" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Appointments
CREATE POLICY "Appointments viewable by members" ON public.appointments FOR SELECT USING (org_id = get_my_org_id() OR customer_id = auth.uid());
CREATE POLICY "Appointments insertable by authenticated" ON public.appointments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Notifications
CREATE POLICY "Notifications viewable by owner" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notifications manageable by owner" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 5. TRIGGER FUNCTIONS

-- Updated At
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'),
        (COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER'))::public.user_role
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'משתמש חדש'), 'CUSTOMER'::public.user_role)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Task Notifications
CREATE OR REPLACE FUNCTION public.notify_employees_new_task()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    emp RECORD;
BEGIN
    FOR emp IN 
        SELECT id FROM public.profiles 
        WHERE org_id = NEW.org_id 
        AND role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM')
        AND membership_status = 'APPROVED'
    LOOP
        INSERT INTO public.notifications (user_id, org_id, title, message, type, metadata)
        VALUES (
            emp.id, 
            NEW.org_id, 
            'משימה חדשה', 
            'נפתחה משימה חדשה: ' || NEW.title, 
            'task_created',
            jsonb_build_object('task_id', NEW.id)
        );
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_client_task_update()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    client_id UUID;
    vehicle_plate TEXT;
BEGIN
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT owner_id, plate INTO client_id, vehicle_plate
    FROM public.vehicles 
    WHERE id = NEW.vehicle_id;

    IF client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, org_id, title, message, type, metadata)
        VALUES (
            client_id, 
            NEW.org_id, 
            'עדכון סטטוס טיפול', 
            'הרכב ' || vehicle_plate || ' שינה סטטוס ל: ' || NEW.status, 
            'task_updated',
            jsonb_build_object('task_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- 6. TRIGGERS

-- Updated At
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Notifications
DROP TRIGGER IF EXISTS on_task_created ON public.tasks;
CREATE TRIGGER on_task_created AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.notify_employees_new_task();

DROP TRIGGER IF EXISTS on_task_updated ON public.tasks;
CREATE TRIGGER on_task_updated AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.notify_client_task_update();

-- 7. RPC FUNCTIONS

CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    UPDATE public.profiles
    SET 
        org_id = new_org_id,
        role = 'SUPER_MANAGER'::public.user_role,
        membership_status = 'APPROVED'
    WHERE id = auth.uid();

    RETURN new_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_by_manager_phone(phone_text TEXT)
RETURNS TABLE (org_id UUID, org_name TEXT) 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.name FROM public.organizations o
    JOIN public.profiles p ON p.org_id = o.id
    WHERE p.phone = phone_text AND p.role = 'SUPER_MANAGER'::public.user_role
    LIMIT 1;
END;
$$;
