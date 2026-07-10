-- Migration: shared wallets + savings goals
-- Run in Supabase SQL Editor after schema.sql (and add_debt_category.sql if run separately).
-- Additive only: existing expenses/income rows are untouched (wallet_id defaults to NULL = personal).

-- ---------------------------------------------------------------------------
-- Wallets
-- ---------------------------------------------------------------------------

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_members (
  wallet_id UUID NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_id, user_id)
);

CREATE TABLE wallet_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wallet_members_user_id_idx ON wallet_members (user_id);
CREATE INDEX wallet_invites_wallet_id_idx ON wallet_invites (wallet_id);
CREATE INDEX wallet_invites_email_idx ON wallet_invites (invited_email);

-- ---------------------------------------------------------------------------
-- Extend expenses / income with nullable wallet_id (NULL = personal, unchanged)
-- ---------------------------------------------------------------------------

ALTER TABLE expenses ADD COLUMN wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE;
ALTER TABLE income ADD COLUMN wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE;

CREATE INDEX expenses_wallet_id_idx ON expenses (wallet_id);
CREATE INDEX income_wallet_id_idx ON income (wallet_id);

-- ---------------------------------------------------------------------------
-- Savings
-- ---------------------------------------------------------------------------

CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) CHECK (target_amount IS NULL OR target_amount >= 0),
  target_date DATE,
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX savings_goals_user_id_idx ON savings_goals (user_id);
CREATE INDEX savings_transactions_goal_id_idx ON savings_transactions (goal_id);

-- Trigger: keep savings_goals.current_amount in sync with its transactions.
-- Deposits add, withdrawals subtract. Runs server-side so it can't drift
-- out of sync even if a client request fails partway through.
CREATE OR REPLACE FUNCTION recalc_savings_goal_balance()
RETURNS TRIGGER AS $$
DECLARE
  affected_goal_id UUID;
BEGIN
  affected_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);

  UPDATE savings_goals
  SET current_amount = COALESCE((
    SELECT SUM(
      CASE WHEN type = 'deposit' THEN amount ELSE -amount END
    )
    FROM savings_transactions
    WHERE goal_id = affected_goal_id
  ), 0)
  WHERE id = affected_goal_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER savings_transactions_after_change
AFTER INSERT OR UPDATE OR DELETE ON savings_transactions
FOR EACH ROW EXECUTE FUNCTION recalc_savings_goal_balance();

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, bypass RLS internally) used by the
-- policies below to check wallet membership/ownership without triggering
-- recursive RLS evaluation on wallet_members itself.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_wallet_member(target_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wallet_members
    WHERE wallet_id = target_wallet_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_wallet_creator(target_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wallets
    WHERE id = target_wallet_id AND created_by = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_wallet_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_creator(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;

-- wallets: visible/manageable by members
CREATE POLICY "Members can view their wallets"
  ON wallets FOR SELECT
  USING (is_wallet_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can create wallets"
  ON wallets FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- wallet_members: visible to members of the same wallet
CREATE POLICY "Members can view wallet membership"
  ON wallet_members FOR SELECT
  USING (is_wallet_member(wallet_id));

CREATE POLICY "Owner can add the creator as first member"
  ON wallet_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR is_wallet_creator(wallet_id)
  );

CREATE POLICY "Members can remove themselves"
  ON wallet_members FOR DELETE
  USING (user_id = auth.uid());

-- wallet_invites: visible to inviter and invitee (matched by email)
CREATE POLICY "Inviter and invitee can view invite"
  ON wallet_invites FOR SELECT
  USING (
    invited_by = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Wallet members can create invites"
  ON wallet_invites FOR INSERT
  WITH CHECK (is_wallet_member(wallet_id));

CREATE POLICY "Invitee can update invite status"
  ON wallet_invites FOR UPDATE
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Inviter can cancel a pending invite"
  ON wallet_invites FOR DELETE
  USING (invited_by = auth.uid());

-- expenses: extend existing personal-only policies to also allow wallet access
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own or wallet expenses"
  ON expenses FOR SELECT
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
CREATE POLICY "Users can insert own or wallet expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      wallet_id IS NULL
      OR is_wallet_member(wallet_id)
    )
  );

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own or wallet expenses"
  ON expenses FOR UPDATE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  )
  WITH CHECK (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own or wallet expenses"
  ON expenses FOR DELETE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

-- income: same wallet-aware pattern
DROP POLICY IF EXISTS "Users can view own income" ON income;
CREATE POLICY "Users can view own or wallet income"
  ON income FOR SELECT
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

DROP POLICY IF EXISTS "Users can insert own income" ON income;
CREATE POLICY "Users can insert own or wallet income"
  ON income FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      wallet_id IS NULL
      OR is_wallet_member(wallet_id)
    )
  );

DROP POLICY IF EXISTS "Users can update own income" ON income;
CREATE POLICY "Users can update own or wallet income"
  ON income FOR UPDATE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  )
  WITH CHECK (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

DROP POLICY IF EXISTS "Users can delete own income" ON income;
CREATE POLICY "Users can delete own or wallet income"
  ON income FOR DELETE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR (is_wallet_member(wallet_id))
  );

-- savings_goals / savings_transactions: personal only for now
CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own savings transactions"
  ON savings_transactions FOR SELECT
  USING (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own savings transactions"
  ON savings_transactions FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own savings transactions"
  ON savings_transactions FOR UPDATE
  USING (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()))
  WITH CHECK (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own savings transactions"
  ON savings_transactions FOR DELETE
  USING (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()));
