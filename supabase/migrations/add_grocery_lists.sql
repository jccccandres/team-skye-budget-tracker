-- Migration: add grocery lists (run in Supabase SQL Editor if schema.sql /
-- "schema 2.sql" was already applied).
--
-- Standalone module: not linked to wallets, expenses, or transfers. Each
-- list belongs to exactly one user. Item ids are expected to be generated
-- client-side (UUID) so the app can create lists/items while offline and
-- sync them later without id collisions.

CREATE TABLE IF NOT EXISTS grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES grocery_lists (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grocery_items_list_id_idx ON grocery_items (list_id);

ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own grocery lists" ON grocery_lists;
CREATE POLICY "Users can view own grocery lists"
  ON grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own grocery lists" ON grocery_lists;
CREATE POLICY "Users can insert own grocery lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own grocery lists" ON grocery_lists;
CREATE POLICY "Users can update own grocery lists"
  ON grocery_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own grocery lists" ON grocery_lists;
CREATE POLICY "Users can delete own grocery lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Items are governed by ownership of their parent list.
DROP POLICY IF EXISTS "Users can view own grocery items" ON grocery_items;
CREATE POLICY "Users can view own grocery items"
  ON grocery_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = list_id AND gl.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own grocery items" ON grocery_items;
CREATE POLICY "Users can insert own grocery items"
  ON grocery_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = list_id AND gl.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own grocery items" ON grocery_items;
CREATE POLICY "Users can update own grocery items"
  ON grocery_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = list_id AND gl.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = list_id AND gl.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own grocery items" ON grocery_items;
CREATE POLICY "Users can delete own grocery items"
  ON grocery_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = list_id AND gl.user_id = auth.uid()));
