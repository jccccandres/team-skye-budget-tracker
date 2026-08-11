-- Allow wallet members to rename their shared wallet. The wallets table
-- only had SELECT/INSERT policies before - there was no way to update a
-- wallet's name at all until now.
--
-- Run this in the Supabase SQL Editor.

CREATE POLICY "Members can rename their wallets"
  ON wallets FOR UPDATE
  USING (is_wallet_member(id))
  WITH CHECK (is_wallet_member(id));
