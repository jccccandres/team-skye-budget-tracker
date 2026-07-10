-- Migration: transfers between Personal, Wallets, and Savings goals.
-- Run in Supabase SQL Editor after add_wallets_and_savings.sql.

CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('personal', 'wallet')),
  source_wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('wallet', 'savings_goal')),
  destination_wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  destination_savings_goal_id UUID REFERENCES savings_goals (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT source_wallet_required CHECK (
    (source_type = 'wallet' AND source_wallet_id IS NOT NULL)
    OR (source_type = 'personal' AND source_wallet_id IS NULL)
  ),
  CONSTRAINT destination_target_required CHECK (
    (destination_type = 'wallet' AND destination_wallet_id IS NOT NULL AND destination_savings_goal_id IS NULL)
    OR (destination_type = 'savings_goal' AND destination_savings_goal_id IS NOT NULL AND destination_wallet_id IS NULL)
  )
);

CREATE INDEX transfers_user_id_idx ON transfers (user_id);
CREATE INDEX transfers_date_idx ON transfers (date);
CREATE INDEX transfers_source_wallet_id_idx ON transfers (source_wallet_id);
CREATE INDEX transfers_destination_wallet_id_idx ON transfers (destination_wallet_id);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- A transfer is only ever created by the acting user (auth.uid()), and only
-- if they're actually allowed to move money from that source and into that
-- destination: a wallet source/destination requires membership, a savings
-- goal destination requires ownership.
CREATE POLICY "Users can view own transfers"
  ON transfers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create valid transfers"
  ON transfers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (source_type = 'personal')
      OR (source_type = 'wallet' AND is_wallet_member(source_wallet_id))
    )
    AND (
      (destination_type = 'wallet' AND is_wallet_member(destination_wallet_id))
      OR (
        destination_type = 'savings_goal'
        AND EXISTS (
          SELECT 1 FROM savings_goals
          WHERE id = destination_savings_goal_id AND user_id = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Atomic transfer function.
--
-- Runs as the calling user (no SECURITY DEFINER) so every insert inside is
-- still subject to normal RLS - this function just bundles three inserts
-- into one all-or-nothing operation:
--   1. A row in `transfers` (the audit trail / source of truth)
--   2. A credit on the destination:
--      - wallet    -> a real `income` row (source = note or 'Transfer')
--      - savings   -> a real `savings_transactions` deposit row
--        (the existing trigger keeps savings_goals.current_amount in sync)
--
-- Money leaving Personal or a Wallet is NOT materialized as a fake expense
-- row (that would pollute expense categories/reports). Instead, dashboards
-- subtract matching `transfers` rows from that source's net balance for the
-- period - see the app-side useDashboard hook.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_transfer(
  p_amount NUMERIC,
  p_date DATE,
  p_note TEXT,
  p_source_type TEXT,
  p_source_wallet_id UUID,
  p_destination_type TEXT,
  p_destination_wallet_id UUID,
  p_destination_savings_goal_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_transfer_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  INSERT INTO transfers (
    user_id, amount, date, note,
    source_type, source_wallet_id,
    destination_type, destination_wallet_id, destination_savings_goal_id
  )
  VALUES (
    auth.uid(), p_amount, p_date, p_note,
    p_source_type, p_source_wallet_id,
    p_destination_type, p_destination_wallet_id, p_destination_savings_goal_id
  )
  RETURNING id INTO new_transfer_id;

  IF p_destination_type = 'wallet' THEN
    INSERT INTO income (user_id, wallet_id, amount, source, frequency, date)
    VALUES (auth.uid(), p_destination_wallet_id, p_amount, COALESCE(p_note, 'Transfer'), 'One-time', p_date);
  ELSIF p_destination_type = 'savings_goal' THEN
    INSERT INTO savings_transactions (goal_id, amount, type, date, note)
    VALUES (p_destination_savings_goal_id, p_amount, 'deposit', p_date, p_note);
  END IF;

  RETURN new_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_transfer(
  NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID
) TO authenticated;
