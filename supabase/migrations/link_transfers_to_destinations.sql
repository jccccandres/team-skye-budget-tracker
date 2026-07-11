-- Link transfer destinations to their source transfer row so deleting the income
-- (or savings deposit) also removes the transfer and updates dashboard totals.

ALTER TABLE income
  ADD COLUMN IF NOT EXISTS transfer_id UUID UNIQUE REFERENCES transfers (id) ON DELETE CASCADE;

ALTER TABLE savings_transactions
  ADD COLUMN IF NOT EXISTS transfer_id UUID UNIQUE REFERENCES transfers (id) ON DELETE CASCADE;

-- Backfill links for existing rows created by create_transfer.
UPDATE income i
SET transfer_id = t.id
FROM transfers t
WHERE i.transfer_id IS NULL
  AND t.destination_type = 'wallet'
  AND t.destination_wallet_id = i.wallet_id
  AND t.user_id = i.user_id
  AND t.amount = i.amount
  AND t.date = i.date;

UPDATE savings_transactions st
SET transfer_id = t.id
FROM transfers t
WHERE st.transfer_id IS NULL
  AND t.destination_type = 'savings_goal'
  AND t.destination_savings_goal_id = st.goal_id
  AND t.amount = st.amount
  AND t.date = st.date
  AND st.type = 'deposit';

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
    INSERT INTO income (user_id, wallet_id, amount, source, frequency, date, transfer_id)
    VALUES (
      auth.uid(), p_destination_wallet_id, p_amount,
      COALESCE(p_note, 'Transfer'), 'One-time', p_date, new_transfer_id
    );
  ELSIF p_destination_type = 'savings_goal' THEN
    INSERT INTO savings_transactions (goal_id, amount, type, date, note, transfer_id)
    VALUES (p_destination_savings_goal_id, p_amount, 'deposit', p_date, p_note, new_transfer_id);
  END IF;

  RETURN new_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_linked_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.transfer_id IS NOT NULL THEN
    DELETE FROM transfers WHERE id = OLD.transfer_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS income_delete_linked_transfer ON income;
CREATE TRIGGER income_delete_linked_transfer
  AFTER DELETE ON income
  FOR EACH ROW
  EXECUTE FUNCTION delete_linked_transfer();

DROP TRIGGER IF EXISTS savings_transactions_delete_linked_transfer ON savings_transactions;
CREATE TRIGGER savings_transactions_delete_linked_transfer
  AFTER DELETE ON savings_transactions
  FOR EACH ROW
  EXECUTE FUNCTION delete_linked_transfer();
