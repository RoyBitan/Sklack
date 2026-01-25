-- Add workflow fields and update statuses
DO $$ 
BEGIN
    -- 1. Add new statuses to the enum if they don't exist
    -- Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE directly in a stable way inside DO blocks easily without complex checks,
    -- but we can use the standard ALTER TYPE.
    
    BEGIN
        ALTER TYPE public.task_status ADD VALUE 'WAITING_FOR_APPROVAL';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.task_status ADD VALUE 'SCHEDULED';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    -- 2. Add scheduled_reminder_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'scheduled_reminder_at') THEN
        ALTER TABLE public.tasks ADD COLUMN scheduled_reminder_at TIMESTAMPTZ;
    END IF;

    -- 3. Add reminder_sent flag to avoid duplicate notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'reminder_sent') THEN
        ALTER TABLE public.tasks ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
    END IF;

END $$;
