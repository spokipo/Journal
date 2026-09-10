-- Migration: Fix ideas_direction_check and ideas_session_check constraints on public.ideas
-- Description: Drops old constraints, normalizes all existing rows to standard values, and adds safe check constraints.

-- 1. Drop existing check constraints
ALTER TABLE public.ideas 
DROP CONSTRAINT IF EXISTS ideas_direction_check;

ALTER TABLE public.ideas 
DROP CONSTRAINT IF EXISTS ideas_session_check;

-- 2. Normalize direction for ALL existing rows
UPDATE public.ideas
SET direction = CASE
  WHEN direction ILIKE '%short%' 
    OR direction ILIKE '%sell%' 
    OR direction ILIKE '%bear%' 
    OR direction ILIKE '%down%' 
    OR direction ILIKE '%put%'
    OR TRIM(direction) IN ('S', 's', '-1')
    THEN 'SHORT'
  ELSE 'LONG'
END;

-- 3. Normalize session for ALL existing rows
UPDATE public.ideas
SET session = CASE
  WHEN session ILIKE '%asia%' OR session ILIKE '%tokyo%' THEN 'ASIA'
  WHEN session ILIKE '%lon%' THEN 'LONDON'
  WHEN session ILIKE '%york%' OR session ILIKE '%ny%' THEN 'NEW_YORK'
  WHEN session ILIKE '%off%' THEN 'OFF_SESSION'
  ELSE 'LONDON'
END;

-- 4. Re-add check constraints
ALTER TABLE public.ideas 
ADD CONSTRAINT ideas_direction_check 
CHECK (direction IN ('LONG', 'SHORT', 'long', 'short'));

ALTER TABLE public.ideas 
ADD CONSTRAINT ideas_session_check 
CHECK (session IN ('ASIA', 'LONDON', 'NEW_YORK', 'OFF_SESSION', 'asia', 'london', 'new_york', 'off_session'));