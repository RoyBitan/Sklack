-- Migration: Update Notifications Table structure
-- Adding missing columns for push notifications and deep linking

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS url TEXT,
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Update existing triggers to use the new columns instead of just metadata
-- or ensure they are populated correctly.
