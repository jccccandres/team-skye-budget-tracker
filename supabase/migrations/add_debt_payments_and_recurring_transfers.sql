-- Migration: debt payments (integrated with transfers) and recurring
-- transfer rules (Option B: checked when the app loads, applied on
-- confirmation - no cron/background jobs).
-- Run after add_transfer_fee.sql.

-- ---------------------------------------------------------------------------
-- Debt payments
--
-- Unlike savings (where current_amount starts at 0 and is always the sum of
-- its transactions), a debt's remaining_balance starts at whatever the user
-- entered when they added the debt - it may already reflect payments made
-- before they started tracking it here. So the trigger below INCREMENTALLY
-- decrements remaining_balance per payment, rather than recomputing it from
-- scratch as a sum.
-- ---------------------------------------------------------------------------

CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts (id) ON DELETE CASCADE,
  transfer_id UUID UNIQUE REFERENCES transfers (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX debt_payments_debt_id_idx ON debt_payments (debt_id);

ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt payments"
  ON debt_payments FOR SELECT
  USING (debt_id IN (SELECT id FROM debts WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own debt payments"
  ON debt_payments FOR INSERT
  WITH CHECK (debt_id IN (SELECT id FROM debts WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own debt payments"
  ON debt_payments FOR DELETE
  USING (debt_id IN (SELECT id FROM debts WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_debt_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE debts SET remaining_balance = GREATEST(remaining_balance - NEW.amount, 0)
    WHERE id = NEW.debt_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE debts SET remaining_balance = remaining_balance + OLD.amount
    WHERE id = OLD.debt_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER debt_payments_after_change
AFTER INSERT OR DELETE ON debt_payments
FOR EACH ROW EXECUTE FUNCTION apply_debt_payment();

-- Deleting a debt payment also removes its linked transfer (same pattern
-- already used for income/savings_transactions/expenses via
-- delete_linked_transfer(), added in link_transfers_to_destinations.sql /
-- add_transfer_fee.sql).
DROP TRIGGER IF EXISTS debt_payments_delete_linked_transfer ON debt_payments;
CREATE TRIGGER debt_payments_delete_linked_transfer
  AFTER DELETE ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION delete_linked_transfer();

-- ---------------------------------------------------------------------------
-- Extend transfers to support "debt" as a destination
-- ---------------------------------------------------------------------------

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination_debt_id UUID REFERENCES debts (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS transfers_destination_debt_id_idx ON transfers (destination_debt_id);

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_destination_type_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_destination_type_check
  CHECK (destination_type IN ('wallet', 'savings_goal', 'debt'));

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS destination_target_required;
ALTER TABLE transfers ADD CONSTRAINT destination_target_required CHECK (
  (destination_type = 'wallet' AND destination_wallet_id IS NOT NULL AND destination_savings_goal_id IS NULL AND destination_debt_id IS NULL)
  OR (destination_type = 'savings_goal' AND destination_savings_goal_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_debt_id IS NULL)
  OR (destination_type = 'debt' AND destination_debt_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_savings_goal_id IS NULL)
);

DROP POLICY IF EXISTS "Users can create valid transfers" ON transfers;
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
      OR (
        destination_type = 'debt'
        AND EXISTS (
          SELECT 1 FROM debts
          WHERE id = destination_debt_id AND user_id = auth.uid()
        )
      )
    )
  );

-- Replace create_transfer with a 10-arg version supporting debt payments,
-- on top of the 9-arg fee-aware version from add_transfer_fee.sql.
-- Signature changed (new param), so that overload must be dropped first.
DROP FUNCTION IF EXISTS public.create_transfer(NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.create_transfer(
  p_amount NUMERIC,
  p_date DATE,
  p_note TEXT,
  p_source_type TEXT,
  p_source_wallet_id UUID,
  p_destination_type TEXT,
  p_destination_wallet_id UUID,
  p_destination_savings_goal_id UUID,
  p_destination_debt_id UUID,
  p_fee NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_transfer_id UUID;
  fee_wallet_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  IF p_fee IS NOT NULL AND p_fee < 0 THEN
    RAISE EXCEPTION 'Transfer fee cannot be negative';
  END IF;

  INSERT INTO transfers (
    user_id, amount, date, note, fee,
    source_type, source_wallet_id,
    destination_type, destination_wallet_id, destination_savings_goal_id, destination_debt_id
  )
  VALUES (
    auth.uid(), p_amount, p_date, p_note,
    CASE WHEN p_fee IS NOT NULL AND p_fee > 0 THEN p_fee ELSE NULL END,
    p_source_type, p_source_wallet_id,
    p_destination_type, p_destination_wallet_id, p_destination_savings_goal_id, p_destination_debt_id
  )
  RETURNING id INTO new_transfer_id;

  IF p_destination_type = 'wallet' THEN
    INSERT INTO income (user_id, wallet_id, amount, source, frequency, date, transfer_id)
    VALUES (
      auth.uid(), p_destination_wallet_id, p_amount,
      COALESCE(p_note, 'Transfer'), 'One-time', p_date, new_transfer_id
    );
  ELSIF p_destination_type = 'savings_goal' THEN
    INSERT INTO savings_transactions (goal_id, amount, type, date, note, transfer_id)
    VALUES (p_destination_savings_goal_id, p_amount, 'deposit', p_date, p_note, new_transfer_id);
  ELSIF p_destination_type = 'debt' THEN
    INSERT INTO debt_payments (debt_id, amount, date, note, transfer_id)
    VALUES (p_destination_debt_id, p_amount, p_date, p_note, new_transfer_id);
  END IF;

  IF p_fee IS NOT NULL AND p_fee > 0 THEN
    fee_wallet_id := CASE WHEN p_source_type = 'wallet' THEN p_source_wallet_id ELSE NULL END;

    INSERT INTO expenses (user_id, wallet_id, amount, category, description, date, transfer_id)
    VALUES (
      auth.uid(), fee_wallet_id, p_fee, 'Other', 'Transfer fee', p_date, new_transfer_id
    );
  END IF;

  RETURN new_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_transfer(
  NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID, UUID, NUMERIC
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Recurring transfers (Option B: no cron. A rule just describes "move this
-- amount, on this day of the month, from X to Y". The app checks for rules
-- that are due whenever the Dashboard loads, and only applies one after the
-- user confirms - nothing happens silently in the background.)
-- ---------------------------------------------------------------------------

CREATE TABLE recurring_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  note TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('personal', 'wallet')),
  source_wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL CHECK (destination_type IN ('wallet', 'savings_goal', 'debt')),
  destination_wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  destination_savings_goal_id UUID REFERENCES savings_goals (id) ON DELETE CASCADE,
  destination_debt_id UUID REFERENCES debts (id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  -- First-of-month marker (e.g. 2026-07-01) for the last month this rule
  -- was applied, so it isn't offered/applied twice in the same month.
  last_applied_month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rt_source_wallet_required CHECK (
    (source_type = 'wallet' AND source_wallet_id IS NOT NULL)
    OR (source_type = 'personal' AND source_wallet_id IS NULL)
  ),
  CONSTRAINT rt_destination_target_required CHECK (
    (destination_type = 'wallet' AND destination_wallet_id IS NOT NULL AND destination_savings_goal_id IS NULL AND destination_debt_id IS NULL)
    OR (destination_type = 'savings_goal' AND destination_savings_goal_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_debt_id IS NULL)
    OR (destination_type = 'debt' AND destination_debt_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_savings_goal_id IS NULL)
  )
);

CREATE INDEX recurring_transfers_user_id_idx ON recurring_transfers (user_id);

ALTER TABLE recurring_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring transfers"
  ON recurring_transfers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own recurring transfers"
  ON recurring_transfers FOR INSERT
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
        AND EXISTS (SELECT 1 FROM savings_goals WHERE id = destination_savings_goal_id AND user_id = auth.uid())
      )
      OR (
        destination_type = 'debt'
        AND EXISTS (SELECT 1 FROM debts WHERE id = destination_debt_id AND user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update own recurring transfers"
  ON recurring_transfers FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own recurring transfers"
  ON recurring_transfers FOR DELETE
  USING (user_id = auth.uid());
