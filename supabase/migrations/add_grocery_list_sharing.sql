-- Migration: allow grocery lists to be shared/invited to other users.
-- Adds members/invites tables and updates grocery RLS to permit access for
-- list owners + members.

CREATE TABLE IF NOT EXISTS grocery_list_members (
  list_id UUID NOT NULL REFERENCES grocery_lists (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS grocery_list_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES grocery_lists (id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grocery_list_members_user_id_idx ON grocery_list_members (user_id);
CREATE INDEX IF NOT EXISTS grocery_list_invites_list_id_idx ON grocery_list_invites (list_id);
CREATE INDEX IF NOT EXISTS grocery_list_invites_email_idx ON grocery_list_invites (invited_email);

CREATE UNIQUE INDEX IF NOT EXISTS grocery_list_invites_pending_unique_idx
  ON grocery_list_invites (list_id, lower(invited_email))
  WHERE status = 'pending';

-- Ensure helper exists when this migration runs independently.
CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_grocery_list_owner(target_list_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE id = target_list_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_grocery_list_member(target_list_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM grocery_lists gl
    WHERE gl.id = target_list_id
      AND (
        gl.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM grocery_list_members glm
          WHERE glm.list_id = gl.id
            AND glm.user_id = auth.uid()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_grocery_list_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_grocery_list_member(UUID) TO authenticated;

ALTER TABLE grocery_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can insert own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can update own grocery lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can delete own grocery lists" ON grocery_lists;

CREATE POLICY "Users can view own or shared grocery lists"
  ON grocery_lists FOR SELECT
  USING (is_grocery_list_member(id));

CREATE POLICY "Users can insert own grocery lists"
  ON grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update grocery lists"
  ON grocery_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete grocery lists"
  ON grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can insert own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can update own grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can delete own grocery items" ON grocery_items;

CREATE POLICY "Users can view own or shared grocery items"
  ON grocery_items FOR SELECT
  USING (is_grocery_list_member(list_id));

CREATE POLICY "Users can insert own or shared grocery items"
  ON grocery_items FOR INSERT
  WITH CHECK (is_grocery_list_member(list_id));

CREATE POLICY "Users can update own or shared grocery items"
  ON grocery_items FOR UPDATE
  USING (is_grocery_list_member(list_id))
  WITH CHECK (is_grocery_list_member(list_id));

CREATE POLICY "Users can delete own or shared grocery items"
  ON grocery_items FOR DELETE
  USING (is_grocery_list_member(list_id));

DROP POLICY IF EXISTS "Members can view grocery list membership" ON grocery_list_members;
CREATE POLICY "Members can view grocery list membership"
  ON grocery_list_members FOR SELECT
  USING (is_grocery_list_member(list_id));

DROP POLICY IF EXISTS "Owners can add grocery list members" ON grocery_list_members;
CREATE POLICY "Owners can add grocery list members"
  ON grocery_list_members FOR INSERT
  WITH CHECK (
    is_grocery_list_owner(list_id)
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM grocery_list_invites gli
        WHERE gli.list_id = grocery_list_members.list_id
          AND lower(gli.invited_email) = lower(auth_user_email())
          AND gli.status = 'accepted'
      )
    )
  );

DROP POLICY IF EXISTS "Members can leave grocery list" ON grocery_list_members;
CREATE POLICY "Members can leave grocery list"
  ON grocery_list_members FOR DELETE
  USING (user_id = auth.uid() OR is_grocery_list_owner(list_id));

DROP POLICY IF EXISTS "Inviter or invitee can view grocery invite" ON grocery_list_invites;
CREATE POLICY "Inviter or invitee can view grocery invite"
  ON grocery_list_invites FOR SELECT
  USING (
    invited_by = auth.uid()
    OR lower(invited_email) = lower(auth_user_email())
  );

DROP POLICY IF EXISTS "Members can create grocery invites" ON grocery_list_invites;
DROP POLICY IF EXISTS "Owners can create grocery invites" ON grocery_list_invites;
CREATE POLICY "Members can create grocery invites"
  ON grocery_list_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND is_grocery_list_member(list_id)
  );

DROP POLICY IF EXISTS "Invitee can update grocery invite status" ON grocery_list_invites;
CREATE POLICY "Invitee can update grocery invite status"
  ON grocery_list_invites FOR UPDATE
  USING (lower(invited_email) = lower(auth_user_email()))
  WITH CHECK (lower(invited_email) = lower(auth_user_email()));

DROP POLICY IF EXISTS "Inviter can cancel grocery invite" ON grocery_list_invites;
CREATE POLICY "Inviter can cancel grocery invite"
  ON grocery_list_invites FOR DELETE
  USING (invited_by = auth.uid());
