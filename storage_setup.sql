-- =====================================================
-- STORAGE BUCKETS SETUP
-- =====================================================

-- 1. Create Buckets
-- Note: You can also do this via the Supabase Dashboard UI > Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('documents', 'documents', true),
  ('tasks', 'tasks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Note on RLS
-- Row Level Security for storage.objects is usually enabled by default in Supabase.
-- If you get "must be owner" errors, you can safely skip the ENABLE RLS command.

-- 3. Policies for Avatars
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Policies for Documents
DROP POLICY IF EXISTS "Manager/Owner Select" ON storage.objects;
CREATE POLICY "Manager/Owner Select" 
ON storage.objects FOR SELECT 
TO authenticated
USING (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER', 'TEAM')
    )
  )
);

DROP POLICY IF EXISTS "Users can upload docs" ON storage.objects;
CREATE POLICY "Users can upload docs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Policies for Tasks
DROP POLICY IF EXISTS "Task Photos Access" ON storage.objects;
CREATE POLICY "Task Photos Access" 
ON storage.objects FOR ALL 
TO authenticated
USING (bucket_id = 'tasks');
