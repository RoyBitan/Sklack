-- Optimization and Trigger Fix
-- Generated at 2026-01-21

-- 1. Add indexes for performance optimization on tasks table
--    This helps check-delayed-tasks and check-scheduled-reminders queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_reminder_at ON public.tasks (scheduled_reminder_at);
-- Adding index on status since we query .eq('status', 'IN_PROGRESS') often
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);

-- 2. Update the trigger function timeout to avoid 5000ms timeout logs during cold starts
CREATE OR REPLACE FUNCTION public.trigger_notification_dispatcher()
RETURNS trigger AS $$
DECLARE
  service_key text;
  api_url text;
  request_id int;
BEGIN
  api_url := 'https://oexnoylxwobshyerktyu.supabase.co/functions/v1/notification-dispatcher';
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leG5veWx4d29ic2h5ZXJrdHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNDcyMCwiZXhwIjoyMDgzMjEwNzIwfQ.Khw5jpVIzz1qyxfkzbs0ORr8mkHAYzWHyzncnqMoXR0';

  -- Increase timeout to 10000ms (10 seconds)
  SELECT net.http_post(
      url := api_url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
          'record', row_to_json(NEW)
      ),
      timeout_milliseconds := 10000
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
