-- Fix: Remove usage of "is_active" from notification trigger
-- "is_active" column does not exist on profiles. We use "membership_status" instead.

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
        AND membership_status = 'APPROVED' -- Replaces "AND is_active = true"
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
