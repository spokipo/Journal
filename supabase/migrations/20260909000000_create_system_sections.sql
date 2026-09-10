-- Create system_sections table
CREATE TABLE IF NOT EXISTS public.system_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  content TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_sections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own system sections" ON public.system_sections;
DROP POLICY IF EXISTS "Users can insert their own system sections" ON public.system_sections;
DROP POLICY IF EXISTS "Users can update their own system sections" ON public.system_sections;
DROP POLICY IF EXISTS "Users can delete their own system sections" ON public.system_sections;

-- RLS Policies
CREATE POLICY "Users can view their own system sections"
  ON public.system_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own system sections"
  ON public.system_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own system sections"
  ON public.system_sections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own system sections"
  ON public.system_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_system_sections_user_order 
  ON public.system_sections (user_id, order_index);

-- Supabase Storage configuration for system-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-images', 'system-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "System images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload system images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own system images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own system images" ON storage.objects;

CREATE POLICY "System images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'system-images');

CREATE POLICY "Authenticated users can upload system images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'system-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own system images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'system-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own system images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'system-images' AND auth.uid()::text = (storage.foldername(name))[1]);

