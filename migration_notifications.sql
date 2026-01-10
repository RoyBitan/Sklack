-- Migration: Notifications System
-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Optional context
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'task_created', 'task_updated', 'system'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB -- store related task_id etc.
);

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. Trigger Function: Task Created (Notify Employees)
CREATE OR REPLACE FUNCTION notify_employees_new_task()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    emp RECORD;
BEGIN
    -- Loop through all managers/employees of the org
    FOR emp IN 
        SELECT id FROM profiles 
        WHERE org_id = NEW.org_id 
        AND role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'EMPLOYEE')
        AND is_active = true
    LOOP
        INSERT INTO notifications (user_id, org_id, title, message, type, metadata)
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
$$ LANGUAGE plpgsql;

-- 5. Trigger: Task Created
DROP TRIGGER IF EXISTS on_task_created ON tasks;
CREATE TRIGGER on_task_created
    AFTER INSERT ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_employees_new_task();


-- 6. Trigger Function: Task Status Update (Notify Client)
CREATE OR REPLACE FUNCTION notify_client_task_update()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
DECLARE
    client_id UUID;
    vehicle_plate TEXT;
BEGIN
    -- Only run if status changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Get Owner ID from Vehicle
    SELECT owner_id, plate INTO client_id, vehicle_plate
    FROM vehicles 
    WHERE id = NEW.vehicle_id;

    -- If we have a client (owner), notify them
    IF client_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, org_id, title, message, type, metadata)
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
$$ LANGUAGE plpgsql;

-- 7. Trigger: Task Updated
DROP TRIGGER IF EXISTS on_task_updated ON tasks;
CREATE TRIGGER on_task_updated
    AFTER UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_client_task_update();
