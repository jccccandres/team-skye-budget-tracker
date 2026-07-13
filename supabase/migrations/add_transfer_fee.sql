-- Optional transfer fees recorded as expenses on the transfer source.

ALTER TABLE transfers
  ADD COLUMN IF NOT EXISTS fee NUMERIC(12, 2) CHECK (fee IS NULL OR fee >= 0);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS transfer_id UUID UNIQUE REFERENCES transfers (id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.create_transfer(
  p_amount NUMERIC,
  p_date DATE,
  p_note TEXT,
  p_source_type TEXT,
  p_source_wallet_id UUID,
  p_destination_type TEXT,
  p_destination_wallet_id UUID,
  p_destination_savings_goal_id UUID,
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
    destination_type, destination_wallet_id, destination_savings_goal_id
  )
  VALUES (
    auth.uid(), p_amount, p_date, p_note,
    CASE WHEN p_fee IS NOT NULL AND p_fee > 0 THEN p_fee ELSE NULL END,
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

DROP FUNCTION IF EXISTS public.create_transfer(NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID);

GRANT EXECUTE ON FUNCTION public.create_transfer(
  NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID, NUMERIC
) TO authenticated;
