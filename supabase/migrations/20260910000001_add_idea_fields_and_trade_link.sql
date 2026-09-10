-- Migration: Add idea_id to trades and ensure expires_at, status exist on ideas
-- Description: Enables linking trades to watchlist ideas and tracking idea lifespans and statuses.

-- 1. Ensure columns on public.ideas
ALTER TABLE public.ideas 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_ideas_user_status 
ON public.ideas (user_id, status);

-- 2. Ensure idea_id on public.trades
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trades_idea_id 
ON public.trades (idea_id);

