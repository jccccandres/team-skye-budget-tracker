-- Full database reset for Budget Tracker
-- Run in Supabase SQL Editor, then run schema 2.sql to rebuild.
--
-- Drops tables first (removes RLS policies), then functions, then types.

-- 1. Tables (CASCADE removes policies, triggers, and FK dependencies)
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS savings_transactions CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS wallet_invites CASCADE;
DROP TABLE IF EXISTS wallet_members CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS income CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;

-- 2. Functions (safe now that dependent policies are gone)
DROP FUNCTION IF EXISTS public.create_transfer(NUMERIC, DATE, TEXT, TEXT, UUID, TEXT, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_wallet_peer_emails(UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.auth_user_email() CASCADE;
DROP FUNCTION IF EXISTS public.is_wallet_creator(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_wallet_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.recalc_savings_goal_balance() CASCADE;

-- 3. Types
DROP TYPE IF EXISTS debt_type;
