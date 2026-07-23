-- Migration: add a grocery item category so lists can be split into
-- sections in the UI. Run in Supabase SQL Editor if add_grocery_lists.sql
-- was already applied.

ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'pantry_snacks';

ALTER TABLE grocery_items
  DROP CONSTRAINT IF EXISTS grocery_items_category_check;

ALTER TABLE grocery_items
  ADD CONSTRAINT grocery_items_category_check
  CHECK (category IN ('meat_frozen', 'fruits_veggies', 'pantry_snacks', 'household_cleaning'));
