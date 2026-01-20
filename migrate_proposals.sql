-- Add photo_url to proposals for optimized asset management
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Log the change
INSERT INTO public.audit_logs (action, table_name, changes)
VALUES ('MIGRATE_PROPOSALS_ASSETS', 'proposals', '{"added": "photo_url"}');
