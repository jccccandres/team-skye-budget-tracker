-- Tracks explicit user balance verifications and any auto-adjustment made
-- to reconcile system totals to the user's real-world amount.

CREATE TABLE balance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('personal', 'wallet', 'savings_goal')),
  wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  savings_goal_id UUID REFERENCES savings_goals (id) ON DELETE CASCADE,
  expected_amount NUMERIC(12, 2) NOT NULL,
  actual_amount NUMERIC(12, 2) NOT NULL,
  delta NUMERIC(12, 2) NOT NULL,
  note TEXT,
  adjustment_applied BOOLEAN NOT NULL DEFAULT false,
  adjustment_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (adjustment_kind IN ('none', 'income', 'expense', 'savings_deposit', 'savings_withdrawal')),
  adjustment_reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT balance_verification_scope_target_check CHECK (
    (scope_type = 'personal' AND wallet_id IS NULL AND savings_goal_id IS NULL)
    OR (scope_type = 'wallet' AND wallet_id IS NOT NULL AND savings_goal_id IS NULL)
    OR (scope_type = 'savings_goal' AND wallet_id IS NULL AND savings_goal_id IS NOT NULL)
  )
);

CREATE INDEX balance_verifications_user_created_idx
  ON balance_verifications (user_id, created_at DESC);

CREATE INDEX balance_verifications_scope_wallet_idx
  ON balance_verifications (user_id, wallet_id, created_at DESC)
  WHERE scope_type = 'wallet';

CREATE INDEX balance_verifications_scope_savings_idx
  ON balance_verifications (user_id, savings_goal_id, created_at DESC)
  WHERE scope_type = 'savings_goal';

ALTER TABLE balance_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their balance verifications"
  ON balance_verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their balance verifications"
  ON balance_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());
