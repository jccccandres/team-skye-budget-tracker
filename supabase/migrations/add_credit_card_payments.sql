-- Migration: credit card bill payments (integrated with transfers), mirroring
-- the debt_payments pattern from add_debt_payments_and_recurring_transfers.sql.
-- Run after add_debt_payments_and_recurring_transfers.sql.

-- ---------------------------------------------------------------------------
-- Credit card payments
--
-- Unlike debts (which have a stored remaining_balance decremented per
-- payment), credit cards have no stored balance column - "amount owed" is
-- computed client-side as:
--   sum(expenses where credit_card_id = X and payment_source = 'credit_card')
--   minus sum(credit_card_payments where credit_card_id = X)
-- So this table only needs to record payments; no balance-syncing trigger
-- is required.
-- ---------------------------------------------------------------------------

CREATE TABLE credit_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards (id) ON DELETE CASCADE,
  transfer_id UUID UNIQUE REFERENCES transfers (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX credit_card_payments_credit_card_id_idx ON credit_card_payments (credit_card_id);

ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit card payments"
  ON credit_card_payments FOR SELECT
  USING (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own credit card payments"
  ON credit_card_payments FOR INSERT
  WITH CHECK (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own credit card payments"
  ON credit_card_payments FOR DELETE
  USING (credit_card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- Deleting a credit card payment also removes its linked transfer (same
-- generic pattern already used for income/savings_transactions/debt_payments
-- via delete_linked_transfer()).
DROP TRIGGER IF EXISTS credit_card_payments_delete_linked_transfer ON credit_card_payments;
CREATE TRIGGER credit_card_payments_delete_linked_transfer
  AFTER DELETE ON credit_card_payments
  FOR EACH ROW
  EXECUTE FUNCTION delete_linked_transfer();

-- ---------------------------------------------------------------------------
-- Extend transfers to support "credit_card" as a destination
-- ---------------------------------------------------------------------------

ALTER TABLE transfers ADD COLUMN IF NOT EXISTS destination_credit_card_id UUID REFERENCES credit_cards (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS transfers_destination_credit_card_id_idx ON transfers (destination_credit_card_id);

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_destination_type_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_destination_type_check
  CHECK (destination_type IN ('wallet', 'savings_goal', 'debt', 'credit_card'));

ALTER TABLE transfers DROP CONSTRAINT IF EXISTS destination_target_required;
ALTER TABLE transfers ADD CONSTRAINT destination_target_required CHECK (
  (destination_type = 'wallet' AND destination_wallet_id IS NOT NULL AND destination_savings_goal_id IS NULL AND destination_debt_id IS NULL AND destination_credit_card_id IS NULL)
  OR (destination_type = 'savings_goal' AND destination_savings_goal_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_debt_id IS NULL AND destination_credit_card_id IS NULL)
  OR (destination_type = 'debt' AND destination_debt_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_savings_goal_id IS NULL AND destination_credit_card_id IS NULL)
  OR (destination_type = 'credit_card' AND destination_credit_card_id IS NOT NULL AND destination_wallet_id IS NULL AND destination_savings_goal_id IS NULL AND destination_debt_id IS NULL)
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
      OR (
        destination_type = 'credit_card'
        AND EXISTS (
          SELECT 1 FROM credit_cards
          WHERE id = destination_credit_card_id AND user_id = auth.uid()
        )
      )
    )
  );

-- Replace create_transfer with an 11-arg version supporting credit card
-- payments, on top of the 10-arg debt-aware version. Signature changed (new
-- param), so that overload must be dropped first.
DROP FUNCTION IF EXISTS public.create_transfer(NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID, UUID, NUMERIC);

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
  p_destination_credit_card_id UUID,
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
    destination_type, destination_wallet_id, destination_savings_goal_id, destination_debt_id, destination_credit_card_id
  )
  VALUES (
    auth.uid(), p_amount, p_date, p_note,
    CASE WHEN p_fee IS NOT NULL AND p_fee > 0 THEN p_fee ELSE NULL END,
    p_source_type, p_source_wallet_id,
    p_destination_type, p_destination_wallet_id, p_destination_savings_goal_id, p_destination_debt_id, p_destination_credit_card_id
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
  ELSIF p_destination_type = 'credit_card' THEN
    INSERT INTO credit_card_payments (credit_card_id, amount, date, note, transfer_id)
    VALUES (p_destination_credit_card_id, p_amount, p_date, p_note, new_transfer_id);
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
  NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID, UUID, UUID, NUMERIC
) TO authenticated;
