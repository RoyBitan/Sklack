-- Add mileage and metadata columns to appointments
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS mileage INTEGER;
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update enum
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'SCHEDULED';
    END IF;
END
$$;

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule the Daily Appointment Reminder
-- Run at 07:00 AM (Jerusalem Time is UTC+2, so 05:00 UTC)
-- We use 05:00 UTC for 07:00 AM Local
SELECT cron.schedule(
  'daily-appointment-reminder-job',
  '0 5 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://oexnoylxwobshyerktyu.supabase.co/functions/v1/daily-appointment-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leG5veWx4d29ic2h5ZXJrdHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNDcyMCwiZXhwIjoyMDgzMjEwNzIwfQ.Khw5jpVIzz1qyxfkzbs0ORr8mkHAYzWHyzncnqMoXR0"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
