-- Budget Tracker schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)
-- for a FRESH Supabase project. It includes everything: expenses, income,
-- debts, shared wallets, savings goals, and transfers.
--
-- If you already ran the original schema.sql plus the migrations in
-- /supabase/migrations, you do NOT need to run this — your database
-- already matches it. This file exists so a brand new project can be set
-- up in one step instead of running 4 files in order.

-- ---------------------------------------------------------------------------
-- Custom types
-- ---------------------------------------------------------------------------

CREATE TYPE debt_type AS ENUM ('one_time', 'installment');

-- ---------------------------------------------------------------------------
-- Core tables
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

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL,
  frequency TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debts are personal-only (not shared via wallets) for now.
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('other', 'car_loan', 'house_loan')),
  type debt_type NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  monthly_payment NUMERIC(12, 2) CHECK (monthly_payment IS NULL OR monthly_payment >= 0),
  due_date DATE,
  remaining_balance NUMERIC(12, 2) NOT NULL CHECK (remaining_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Savings goals are personal-only (owned by one user), but can be funded
-- from a shared wallet via a transfer (see `transfers` below).
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

-- A record of money moved between Personal, a Wallet, or a Savings goal.
-- See the `create_transfer` function below for how this is used.
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

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX expenses_user_id_idx ON expenses (user_id);
CREATE INDEX expenses_date_idx ON expenses (date);
CREATE INDEX expenses_wallet_id_idx ON expenses (wallet_id);

CREATE INDEX income_user_id_idx ON income (user_id);
CREATE INDEX income_date_idx ON income (date);
CREATE INDEX income_wallet_id_idx ON income (wallet_id);

CREATE INDEX debts_user_id_idx ON debts (user_id);
CREATE INDEX debts_category_idx ON debts (category);

CREATE INDEX wallet_members_user_id_idx ON wallet_members (user_id);
CREATE INDEX wallet_invites_wallet_id_idx ON wallet_invites (wallet_id);
CREATE INDEX wallet_invites_email_idx ON wallet_invites (invited_email);

CREATE INDEX savings_goals_user_id_idx ON savings_goals (user_id);
CREATE INDEX savings_transactions_goal_id_idx ON savings_transactions (goal_id);

CREATE INDEX transfers_user_id_idx ON transfers (user_id);
CREATE INDEX transfers_date_idx ON transfers (date);
CREATE INDEX transfers_source_wallet_id_idx ON transfers (source_wallet_id);
CREATE INDEX transfers_destination_wallet_id_idx ON transfers (destination_wallet_id);

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

CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_wallet_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_email() TO authenticated;

-- ---------------------------------------------------------------------------
-- Savings: keep current_amount in sync with its transactions automatically.
-- Deposits add, withdrawals subtract. Runs server-side so it can't drift
-- out of sync even if a client request fails partway through.
-- ---------------------------------------------------------------------------

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
-- Transfers: move money between Personal, a Wallet, and a Savings goal in
-- one atomic operation.
--
-- Runs as the calling user (no SECURITY DEFINER) so every insert inside is
-- still subject to normal RLS - this function just bundles two/three
-- inserts into one all-or-nothing operation:
--   1. A row in `transfers` (the audit trail / source of truth)
--   2. A credit on the destination:
--      - wallet    -> a real `income` row (source = note or 'Transfer')
--      - savings   -> a real `savings_transactions` deposit row
--        (the trigger above keeps savings_goals.current_amount in sync)
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- wallets: visible to members, and to the creator even before their
-- membership row exists (needed so `.insert().select()` can return the
-- new row - Postgres RLS applies SELECT policies to RETURNING too).
CREATE POLICY "Members can view their wallets"
  ON wallets FOR SELECT
  USING (is_wallet_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can create wallets"
  ON wallets FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- wallet_members
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
    OR lower(invited_email) = lower(auth_user_email())
  );

CREATE POLICY "Wallet members can create invites"
  ON wallet_invites FOR INSERT
  WITH CHECK (is_wallet_member(wallet_id));

CREATE POLICY "Invitee can update invite status"
  ON wallet_invites FOR UPDATE
  USING (lower(invited_email) = lower(auth_user_email()))
  WITH CHECK (lower(invited_email) = lower(auth_user_email()));

CREATE POLICY "Inviter can cancel a pending invite"
  ON wallet_invites FOR DELETE
  USING (invited_by = auth.uid());

-- expenses: personal (wallet_id IS NULL) or shared wallet access
CREATE POLICY "Users can view own or wallet expenses"
  ON expenses FOR SELECT
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

CREATE POLICY "Users can insert own or wallet expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (wallet_id IS NULL OR is_wallet_member(wallet_id))
  );

CREATE POLICY "Users can update own or wallet expenses"
  ON expenses FOR UPDATE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  )
  WITH CHECK (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

CREATE POLICY "Users can delete own or wallet expenses"
  ON expenses FOR DELETE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

-- income: personal (wallet_id IS NULL) or shared wallet access
CREATE POLICY "Users can view own or wallet income"
  ON income FOR SELECT
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

CREATE POLICY "Users can insert own or wallet income"
  ON income FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (wallet_id IS NULL OR is_wallet_member(wallet_id))
  );

CREATE POLICY "Users can update own or wallet income"
  ON income FOR UPDATE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  )
  WITH CHECK (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

CREATE POLICY "Users can delete own or wallet income"
  ON income FOR DELETE
  USING (
    (wallet_id IS NULL AND auth.uid() = user_id)
    OR is_wallet_member(wallet_id)
  );

-- debts: personal only
CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts"
  ON debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE
  USING (auth.uid() = user_id);

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

-- transfers: a user can only see/create their own, and only between
-- sources/destinations they're actually allowed to touch.
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
