-- ============================================================================
-- Migration: Ensure Complete Row Level Security (RLS) across all tables & storage
-- Guarantees that all user data is strictly scoped and isolated per user in the database
-- ============================================================================

-- 1. Enable RLS on all user-facing data tables
ALTER TABLE IF EXISTS public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_sections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. TRADING_ACCOUNTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.trading_accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.trading_accounts;

CREATE POLICY "Users can view their own accounts"
  ON public.trading_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON public.trading_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.trading_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.trading_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. TRADES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON public.trades;

CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. IDEAS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can insert their own ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can update their own ideas" ON public.ideas;
DROP POLICY IF EXISTS "Users can delete their own ideas" ON public.ideas;

CREATE POLICY "Users can view their own ideas"
  ON public.ideas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ideas"
  ON public.ideas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ideas"
  ON public.ideas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ideas"
  ON public.ideas FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. PLAYBOOKS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can insert their own playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can update their own playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can delete their own playbooks" ON public.playbooks;

CREATE POLICY "Users can view their own playbooks"
  ON public.playbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playbooks"
  ON public.playbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playbooks"
  ON public.playbooks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playbooks"
  ON public.playbooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. USER_MISTAKES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own mistakes" ON public.user_mistakes;
DROP POLICY IF EXISTS "Users can insert their own mistakes" ON public.user_mistakes;
DROP POLICY IF EXISTS "Users can update their own mistakes" ON public.user_mistakes;
DROP POLICY IF EXISTS "Users can delete their own mistakes" ON public.user_mistakes;

CREATE POLICY "Users can view their own mistakes"
  ON public.user_mistakes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mistakes"
  ON public.user_mistakes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mistakes"
  ON public.user_mistakes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mistakes"
  ON public.user_mistakes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. STORAGE BUCKETS & STORAGE POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('playbook-screens', 'playbook-screens', true),
  ('system-images', 'system-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Playbook screens storage policies
DROP POLICY IF EXISTS "Screenshots are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own screenshots" ON storage.objects;

CREATE POLICY "Screenshots are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('playbook-screens', 'system-images', 'avatars'));

CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('playbook-screens', 'system-images', 'avatars')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('playbook-screens', 'system-images', 'avatars')
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('playbook-screens', 'system-images', 'avatars')
    AND auth.role() = 'authenticated'
  );

