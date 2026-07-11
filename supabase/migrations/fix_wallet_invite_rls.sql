-- Fix wallet invite visibility for recipients.
-- The original policies queried auth.users directly inside RLS, which fails with
-- "permission denied for table users" for the authenticated role. Use a
-- SECURITY DEFINER helper (same pattern as is_wallet_member) to read the
-- current user's email safely.

CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_email() TO authenticated;

DROP POLICY IF EXISTS "Inviter and invitee can view invite" ON wallet_invites;
CREATE POLICY "Inviter and invitee can view invite"
  ON wallet_invites FOR SELECT
  USING (
    invited_by = auth.uid()
    OR lower(invited_email) = lower(auth_user_email())
  );

DROP POLICY IF EXISTS "Invitee can update invite status" ON wallet_invites;
CREATE POLICY "Invitee can update invite status"
  ON wallet_invites FOR UPDATE
  USING (lower(invited_email) = lower(auth_user_email()))
  WITH CHECK (lower(invited_email) = lower(auth_user_email()));
