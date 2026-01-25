-- Consolidated Fix for Permissions and Triggers
-- Generated at 2026-01-21 21:55:00

-- 1. Ensure Service Role has explicit access to necessary tables
--    This fixes 'permission denied for table tasks'
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.tasks TO service_role;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.vehicles TO service_role;

-- 2. Define the exact trigger function with SECURITY DEFINER
--    This ensures it runs as the database owner, bypassing RLS for the trigger action itself
CREATE OR REPLACE FUNCTION public.trigger_notification_dispatcher()
RETURNS trigger AS $$
DECLARE
  service_key text;
  api_url text;
  request_id int;
BEGIN
  -- We assume the URL based on the project.
  -- In a perfect world, we'd store this in a 'secrets' table or Vault.
  api_url := 'https://oexnoylxwobshyerktyu.supabase.co/functions/v1/notification-dispatcher';
  
  -- The Service Role Key provided by the user
  service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leG5veWx4d29ic2h5ZXJrdHl1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYzNDcyMCwiZXhwIjoyMDgzMjEwNzIwfQ.Khw5jpVIzz1qyxfkzbs0ORr8mkHAYzWHyzncnqMoXR0';

  -- Perform the async HTTP POST to the Edge Function
  SELECT net.http_post(
      url := api_url,
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
          'record', row_to_json(NEW)
      )
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger on the notifications table
DROP TRIGGER IF EXISTS on_notification_created_dispatch ON public.notifications;

CREATE TRIGGER on_notification_created_dispatch
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notification_dispatcher();
