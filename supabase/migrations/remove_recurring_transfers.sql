-- Migration: remove the recurring transfers feature.
-- Run in Supabase SQL Editor. This only drops recurring_transfers - it does
-- not touch transfers, debt_payments, or any other table. Any transfers
-- already created by past applications of a recurring rule are untouched
-- (they're regular rows in `transfers`, independent of this table).

DROP TABLE IF EXISTS recurring_transfers;
