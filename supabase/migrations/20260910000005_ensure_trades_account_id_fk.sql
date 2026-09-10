-- Migration: Ensure trades.account_id references public.trading_accounts
-- Description: Establishes a formal foreign key relationship between trades and accounts with ON DELETE SET NULL, plus an index for fast lookups.

-- 1. Ensure column exists and add foreign key constraint
DO $$
BEGIN
  -- Check if foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_trades_account' 
      AND table_name = 'trades'
  ) THEN
    -- If account_id column is missing, create it
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'trades' AND column_name = 'account_id'
    ) THEN
      ALTER TABLE public.trades ADD COLUMN account_id UUID;
    END IF;

    -- Add foreign key constraint
    ALTER TABLE public.trades
      ADD CONSTRAINT fk_trades_account
      FOREIGN KEY (account_id)
      REFERENCES public.trading_accounts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Index for fast queries by account
CREATE INDEX IF NOT EXISTS idx_trades_account_id 
ON public.trades (account_id);

