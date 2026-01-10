-- Fix: Prevent self-notifications
-- We should not notify the user who performed the action.

-- 1. Update notify_employees_new_task
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
        AND membership_status = 'APPROVED'
        AND id != auth.uid() -- Exclude the current user (actor)
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

-- 2. Update notify_client_task_update
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
    -- BUT ONLY if they are not the one acting (e.g. if manager updates, notify client. If client approves, don't notify client).
    IF client_id IS NOT NULL AND client_id != auth.uid() THEN
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
