-- =====================================================
-- PERFORMANCE OPTIMIZATION: JSONB & GIN INDEXES
-- Optimized for Sklack Garage Management System
-- =====================================================

-- 1. Indexing Task Metadata
-- We frequently search for tasks by customer phone or type within the JSONB metadata.
CREATE INDEX IF NOT EXISTS idx_tasks_metadata_phone ON public.tasks ((metadata ->> 'ownerPhone'));
CREATE INDEX IF NOT EXISTS idx_tasks_metadata_type ON public.tasks ((metadata ->> 'type'));

-- 2. General GIN Index for Metadata (for flexible queries)
-- This allows efficient searching across any field in the JSONB.
CREATE INDEX IF NOT EXISTS idx_tasks_metadata_gin ON public.tasks USING GIN (metadata);

-- 3. Indexing Profiles Metadata/Settings
-- If we ever query by notification settings or other JSONB fields in profiles.
CREATE INDEX IF NOT EXISTS idx_profiles_notification_settings ON public.profiles USING GIN (notification_settings);

-- 4. Indexing Audit Logs metadata
CREATE INDEX IF NOT EXISTS idx_audit_logs_changes ON public.audit_logs USING GIN (changes);

-- Log the optimization
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('APPLY_PERFORMANCE_INDEXES', 'multiple', '{"status": "COMPLETED", "version": "1.0"}');
