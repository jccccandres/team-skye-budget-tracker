-- Aggregate income/expense/transfer totals server-side (SUM), instead of
-- fetching every row to the browser and summing there in JavaScript. This
-- keeps the Dashboard (which only needs totals, not the underlying rows)
-- fast as transaction history grows, without needing snapshot tables or
-- scheduled jobs to stay in sync - it's a live query, always correct.
--
-- Transactions/Reports still fetch full rows (they need them for the
-- transaction list / category breakdown), so they keep using the existing
-- row-fetching path in useWalletPeriodFinancials.
--
-- Run this in the Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_wallet_totals(
  p_wallet_id UUID,
  p_start DATE DEFAULT NULL,
  p_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  total_credit_card_expenses NUMERIC,
  transferred_out NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((
      SELECT SUM(amount) FROM income
      WHERE (
        (p_wallet_id IS NULL AND wallet_id IS NULL AND user_id = auth.uid())
        OR (p_wallet_id IS NOT NULL AND wallet_id = p_wallet_id)
      )
      AND (p_start IS NULL OR date >= p_start)
      AND (p_end IS NULL OR date <= p_end)
    ), 0) AS total_income,
    COALESCE((
      SELECT SUM(amount) FROM expenses
      WHERE (
        (p_wallet_id IS NULL AND wallet_id IS NULL AND user_id = auth.uid())
        OR (p_wallet_id IS NOT NULL AND wallet_id = p_wallet_id)
      )
      AND (p_start IS NULL OR date >= p_start)
      AND (p_end IS NULL OR date <= p_end)
    ), 0) AS total_expenses,
    COALESCE((
      SELECT SUM(amount) FROM expenses
      WHERE (
        (p_wallet_id IS NULL AND wallet_id IS NULL AND user_id = auth.uid())
        OR (p_wallet_id IS NOT NULL AND wallet_id = p_wallet_id)
      )
      AND payment_source = 'credit_card'
      AND (p_start IS NULL OR date >= p_start)
      AND (p_end IS NULL OR date <= p_end)
    ), 0) AS total_credit_card_expenses,
    COALESCE((
      SELECT SUM(amount) FROM transfers
      WHERE (
        (p_wallet_id IS NULL AND source_type = 'personal' AND user_id = auth.uid())
        OR (p_wallet_id IS NOT NULL AND source_type = 'wallet' AND source_wallet_id = p_wallet_id)
      )
      AND (p_start IS NULL OR date >= p_start)
      AND (p_end IS NULL OR date <= p_end)
    ), 0) AS transferred_out;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_totals(UUID, DATE, DATE) TO authenticated;
