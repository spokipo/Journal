-- Supabase Storage configuration for avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Drop existing policies if any to prevent duplicate errors
DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- 1. Anyone can view avatars (public read)
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload avatars
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
  );

-- 3. Authenticated users can update their own avatars (needed for upsert: true)
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid()::text = split_part(name, '/', 1)
      OR auth.uid()::text = split_part(name, '-', 1)
    )
  )
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid()::text = split_part(name, '/', 1)
      OR auth.uid()::text = split_part(name, '-', 1)
    )
  );

-- 4. Authenticated users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.uid()::text = split_part(name, '/', 1)
      OR auth.uid()::text = split_part(name, '-', 1)
    )
  );
