-- Migration: Enhanced Appointment-to-Task Workflow
-- Date: 2026-01-26
-- Description: Adds fields to support the appointment workflow with task linkage and customer data

-- Add new columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

-- Create index on task_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_task_id ON appointments(task_id);

-- Create index on appointment_date for daily trigger queries
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointment_date, status);

-- Add comment to document the workflow
COMMENT ON COLUMN appointments.task_id IS 'Links to the task created when appointment is approved';
COMMENT ON COLUMN appointments.requested_at IS 'Timestamp when customer submitted the appointment request';

-- Function to get today's scheduled appointments for admin notifications
CREATE OR REPLACE FUNCTION get_todays_scheduled_appointments(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  vehicle_plate TEXT,
  service_type TEXT,
  appointment_time TEXT,
  customer_phone TEXT,
  mileage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.customer_name,
    a.vehicle_plate,
    a.service_type,
    a.appointment_time,
    a.customer_phone,
    a.mileage
  FROM appointments a
  WHERE a.org_id = p_org_id
    AND a.status = 'SCHEDULED'
    AND a.appointment_date = CURRENT_DATE::TEXT
  ORDER BY a.appointment_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_todays_scheduled_appointments(UUID) TO authenticated;
