-- Add new fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"vibrate": true, "sound": "default", "events": ["TASK_CREATED", "TASK_CLAIMED", "TASK_COMPLETED"]}'::JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add new fields to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS vehicle_year TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS immobilizer_code TEXT;

-- Enable Real-time for tasks, appointments, and notifications
-- Note: Subscriptions are handled by Supabase Publication
-- We ensure the 'supabase_realtime' publication includes all tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
