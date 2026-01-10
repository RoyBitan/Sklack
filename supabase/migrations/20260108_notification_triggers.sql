-- Push Notification System - Database Triggers (CORRECTED)
-- This migration creates automatic notification triggers for role-based push notifications
-- Matches existing notifications table structure (using 'message' instead of 'body')

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to send notification to admins
CREATE OR REPLACE FUNCTION notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_url TEXT DEFAULT '/',
  p_task_id UUID DEFAULT NULL,
  p_urgent BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Send notification to all admins (SUPER_MANAGER, DEPUTY_MANAGER)
  -- The app seems to be designed for single organization management per deployment or properly filtered by org_id in queries.
  -- To be safe, we notify admins that are in the system.
  
  FOR admin_record IN 
    SELECT id FROM profiles 
    WHERE role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
  LOOP
    INSERT INTO notifications (user_id, title, message, url, task_id, urgent, type, created_at)
    VALUES (admin_record.id, p_title, p_message, p_url, p_task_id, p_urgent, 'system', NOW());
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send notification to specific user
CREATE OR REPLACE FUNCTION notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_url TEXT DEFAULT '/',
  p_task_id UUID DEFAULT NULL,
  p_urgent BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, url, task_id, urgent, type, created_at)
    VALUES (p_user_id, p_title, p_message, p_url, p_task_id, p_urgent, 'system', NOW());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TASK TRIGGERS
-- ============================================

-- Trigger 1: New Task Created
CREATE OR REPLACE FUNCTION on_task_created()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_plate TEXT;
BEGIN
  -- Get vehicle plate
  SELECT plate INTO vehicle_plate FROM vehicles WHERE id = NEW.vehicle_id;
  
  -- Notify admins
  PERFORM notify_admins(
    'משימה חדשה',
    'משימה חדשה: רכב ' || COALESCE(vehicle_plate, 'לא ידוע') || ' ממתין לטיפול',
    '/#/task/' || NEW.id::text,
    NEW.id,
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_created_trigger ON tasks;
CREATE TRIGGER task_created_trigger
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION on_task_created();

-- Trigger 2: Worker Picked Up Task (Status changed to IN_PROGRESS)
CREATE OR REPLACE FUNCTION on_task_picked_up()
RETURNS TRIGGER AS $$
DECLARE
  worker_name TEXT;
  customer_id UUID;
  vehicle_plate TEXT;
  assigned_worker_id UUID;
BEGIN
  -- Only trigger when status changes to IN_PROGRESS
  IF NEW.status = 'IN_PROGRESS' AND (OLD.status IS NULL OR OLD.status != 'IN_PROGRESS') THEN
    -- Get first assigned worker (if any)
    IF array_length(NEW.assigned_to, 1) > 0 THEN
      assigned_worker_id := NEW.assigned_to[1];
      
      -- Get worker name
      SELECT full_name INTO worker_name FROM profiles WHERE id = assigned_worker_id;
      
      -- Get customer and vehicle info
      SELECT v.owner_id, v.plate INTO customer_id, vehicle_plate 
      FROM vehicles v WHERE v.id = NEW.vehicle_id;
      
      -- Notify admins
      PERFORM notify_admins(
        'עובד התחיל טיפול',
        'העובד ' || COALESCE(worker_name, 'לא ידוע') || ' התחיל לעבוד על רכב ' || COALESCE(vehicle_plate, 'לא ידוע'),
        '/#/task/' || NEW.id::text,
        NEW.id,
        FALSE
      );
      
      -- Notify customer
      IF customer_id IS NOT NULL THEN
        PERFORM notify_user(
          customer_id,
          'הטיפול החל!',
          'העובד ' || COALESCE(worker_name, 'לא ידוע') || ' התחיל לעבוד על הרכב שלך!',
          '/#/status/' || NEW.id::text,
          NEW.id,
          FALSE
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_picked_up_trigger ON tasks;
CREATE TRIGGER task_picked_up_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION on_task_picked_up();

-- Trigger 3: Task Completed
CREATE OR REPLACE FUNCTION on_task_completed()
RETURNS TRIGGER AS $$
DECLARE
  customer_id UUID;
  vehicle_plate TEXT;
BEGIN
  -- Only trigger when status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    -- Get customer and vehicle info
    SELECT v.owner_id, v.plate INTO customer_id, vehicle_plate 
    FROM vehicles v WHERE v.id = NEW.vehicle_id;
    
    -- Notify admins
    PERFORM notify_admins(
      'טיפול הושלם',
      'הטיפול ברכב ' || COALESCE(vehicle_plate, 'לא ידוע') || ' הסתיים!',
      '/#/task/' || NEW.id::text,
      NEW.id,
      FALSE
    );
    
    -- Notify customer
    IF customer_id IS NOT NULL THEN
      PERFORM notify_user(
        customer_id,
        'הרכב מוכן!',
        'הטיפול הסתיים! הרכב מוכן לאיסוף',
        '/#/status/' || NEW.id::text,
        NEW.id,
        FALSE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_completed_trigger ON tasks;
CREATE TRIGGER task_completed_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION on_task_completed();

-- ============================================
-- APPOINTMENT TRIGGERS
-- ============================================

-- Trigger 4: New Appointment Request
CREATE OR REPLACE FUNCTION on_appointment_requested()
RETURNS TRIGGER AS $$
DECLARE
  customer_name TEXT;
BEGIN
  -- Get customer name
  SELECT full_name INTO customer_name FROM profiles WHERE id = NEW.customer_id;
  
  -- Notify admins
  PERFORM notify_admins(
    'בקשת תור חדשה',
    'בקשת זימון תור חדשה מ-' || COALESCE(customer_name, 'לקוח'),
    '/#/appointments',
    NULL,
    FALSE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_requested_trigger ON appointments;
CREATE TRIGGER appointment_requested_trigger
AFTER INSERT ON appointments
FOR EACH ROW
WHEN (NEW.status = 'PENDING')
EXECUTE FUNCTION on_appointment_requested();

-- Trigger 5: Appointment Confirmed
CREATE OR REPLACE FUNCTION on_appointment_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to APPROVED
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    -- Notify customer
    PERFORM notify_user(
      NEW.customer_id,
      'התור אושר!',
      'התור שלך אושר! מחכים לך במוסך במועד שנקבע',
      '/#/appointments',
      NULL,
      FALSE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS appointment_confirmed_trigger ON appointments;
CREATE TRIGGER appointment_confirmed_trigger
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION on_appointment_confirmed();

-- ============================================
-- PROPOSAL TRIGGERS (Extra Repair & Price Quote)
-- ============================================

-- Trigger 6: Extra Repair Suggested (Proposal created by worker)
CREATE OR REPLACE FUNCTION on_proposal_created()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_plate TEXT;
BEGIN
  -- Get vehicle plate
  SELECT v.plate INTO vehicle_plate 
  FROM tasks t
  JOIN vehicles v ON v.id = t.vehicle_id
  WHERE t.id = NEW.task_id;
  
  -- Notify admins for approval
  PERFORM notify_admins(
    'תיקון נוסף מוצע',
    'העובד מציע תיקון נוסף ב-' || COALESCE(vehicle_plate, 'רכב') || '. דרוש אישור מחיר.',
    '/#/task/' || NEW.task_id::text,
    NEW.task_id,
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS proposal_created_trigger ON proposals;
CREATE TRIGGER proposal_created_trigger
AFTER INSERT ON proposals
FOR EACH ROW
WHEN (NEW.status = 'PENDING_MANAGER')
EXECUTE FUNCTION on_proposal_created();

-- Trigger 7: Price Quote Sent to Customer
CREATE OR REPLACE FUNCTION on_proposal_sent_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  customer_id UUID;
BEGIN
  -- Only trigger when status changes to PENDING_CUSTOMER
  IF NEW.status = 'PENDING_CUSTOMER' AND (OLD.status IS NULL OR OLD.status != 'PENDING_CUSTOMER') THEN
    -- Get customer ID from task
    SELECT v.owner_id INTO customer_id
    FROM tasks t
    JOIN vehicles v ON v.id = t.vehicle_id
    WHERE t.id = NEW.task_id;
    
    -- Notify customer
    IF customer_id IS NOT NULL THEN
      PERFORM notify_user(
        customer_id,
        'הצעת מחיר',
        'הצעה לעבודה נוספת ברכבך ממתינה לאישורך. לחץ לצפייה.',
        '/#/task/' || NEW.task_id::text,
        NEW.task_id,
        FALSE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS proposal_sent_to_customer_trigger ON proposals;
CREATE TRIGGER proposal_sent_to_customer_trigger
AFTER UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION on_proposal_sent_to_customer();
