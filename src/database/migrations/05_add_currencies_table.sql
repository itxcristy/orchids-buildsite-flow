-- Migration: Add Currencies Table
-- Date: January 2025
-- Description: Adds currencies table for multi-currency support

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create currencies table
CREATE TABLE IF NOT EXISTS public.currencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) UNIQUE NOT NULL, -- ISO 4217 currency code (USD, EUR, INR, etc.)
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  is_base BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_currencies_code ON public.currencies(code);
CREATE INDEX IF NOT EXISTS idx_currencies_is_base ON public.currencies(is_base);

-- Insert common currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_base) VALUES
  ('INR', 'Indian Rupee', '₹', 1, true),
  ('USD', 'US Dollar', '$', 0.012, false),
  ('EUR', 'Euro', '€', 0.011, false),
  ('GBP', 'British Pound', '£', 0.0095, false),
  ('JPY', 'Japanese Yen', '¥', 1.8, false),
  ('AUD', 'Australian Dollar', 'A$', 0.018, false),
  ('CAD', 'Canadian Dollar', 'C$', 0.016, false),
  ('CHF', 'Swiss Franc', 'CHF', 0.011, false),
  ('CNY', 'Chinese Yuan', '¥', 0.087, false),
  ('AED', 'UAE Dirham', 'د.إ', 0.044, false),
  ('SAR', 'Saudi Riyal', '﷼', 0.045, false)
ON CONFLICT (code) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verify migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'currencies'
  ) THEN
    RAISE NOTICE '✅ Currencies table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Currencies table creation failed';
  END IF;
END $$;
