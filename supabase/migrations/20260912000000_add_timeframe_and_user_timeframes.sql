-- ============================================================================
-- Migration: Add timeframe to trades and create user_timeframes table
-- ============================================================================

-- 1. Ensure timeframe column on public.trades
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS timeframe TEXT;

CREATE INDEX IF NOT EXISTS idx_trades_timeframe 
ON public.trades (user_id, timeframe);

-- 2. Create user_timeframes table for user-specific custom timeframes
CREATE TABLE IF NOT EXISTS public.user_timeframes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_timeframe UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_timeframes_user_id 
ON public.user_timeframes (user_id);

-- 3. Row Level Security for user_timeframes
ALTER TABLE public.user_timeframes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own timeframes" ON public.user_timeframes;
DROP POLICY IF EXISTS "Users can insert their own timeframes" ON public.user_timeframes;
DROP POLICY IF EXISTS "Users can update their own timeframes" ON public.user_timeframes;
DROP POLICY IF EXISTS "Users can delete their own timeframes" ON public.user_timeframes;

CREATE POLICY "Users can view their own timeframes"
  ON public.user_timeframes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeframes"
  ON public.user_timeframes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeframes"
  ON public.user_timeframes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeframes"
  ON public.user_timeframes FOR DELETE
  USING (auth.uid() = user_id);
