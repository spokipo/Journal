-- Migration: Remove 'type' column from trading_accounts
-- Description: Drop 'type' (real/demo/paper) column as accounts are now differentiated by scope ('personal' | 'prop') and prop_mode.

ALTER TABLE public.trading_accounts 
DROP COLUMN IF EXISTS type;

-- Ensure is_archived and is_default have consistent non-null values
UPDATE public.trading_accounts
SET is_archived = false
WHERE is_archived IS NULL;

UPDATE public.trading_accounts
SET is_default = false
WHERE is_default IS NULL;

ALTER TABLE public.trading_accounts 
ALTER COLUMN is_archived SET DEFAULT false,
ALTER COLUMN is_default SET DEFAULT false;

