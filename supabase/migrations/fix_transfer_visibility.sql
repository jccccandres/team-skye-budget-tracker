-- Let wallet members see transfers that touch their shared wallets, and expose
-- peer emails for transfer history labels.

CREATE OR REPLACE FUNCTION public.get_wallet_peer_emails(peer_user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id = ANY(peer_user_ids)
    AND u.id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM wallet_members mine
      JOIN wallet_members theirs ON mine.wallet_id = theirs.wallet_id
      WHERE mine.user_id = auth.uid()
        AND theirs.user_id = u.id
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_peer_emails(UUID[]) TO authenticated;

DROP POLICY IF EXISTS "Users can view own transfers" ON transfers;
CREATE POLICY "Users can view relevant transfers"
  ON transfers FOR SELECT
  USING (
    user_id = auth.uid()
    OR (source_type = 'wallet' AND is_wallet_member(source_wallet_id))
    OR (destination_type = 'wallet' AND is_wallet_member(destination_wallet_id))
  );
