-- Migration: add debt category (run in Supabase SQL Editor if schema.sql was already applied)
-- Separates car loans, house loans, and other debts.

ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

ALTER TABLE debts
  DROP CONSTRAINT IF EXISTS debts_category_check;

ALTER TABLE debts
  ADD CONSTRAINT debts_category_check
  CHECK (category IN ('other', 'car_loan', 'house_loan'));

CREATE INDEX IF NOT EXISTS debts_category_idx ON debts (category);
