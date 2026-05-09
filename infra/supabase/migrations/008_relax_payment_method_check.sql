-- 008_relax_payment_method_check.sql
--
-- Purpose:
--   The original payments.payment_method CHECK constraint (from
--   001_initial_schema.sql) only allowed ('mtn_money','airtel_money'),
--   which rejected every real value the platform actually writes:
--
--     - Frontend pricing modal sends payment_method='card', which the
--       backend stores as 'card_money'  → check_violation.
--     - The (now-reverted) Lenco initiation path stored values prefixed
--       with 'lenco_'                   → check_violation.
--
--   Result: any DPO card payment or Lenco payment silently failed to
--   insert into the payments table. This migration widens the allowlist
--   to cover the values the application actually emits.
--
-- Architectural note:
--   stdlib SQL CHECK constraints on a free-text payment_method field are
--   low-value defence in depth — the right long-term fix is to validate
--   and normalize this at the application layer (Pydantic enum on input,
--   single chokepoint that maps frontend choice → DB value). That's a
--   separate, larger refactor. Until then, this migration just expands
--   the allowlist so paying users aren't blocked.
--
-- Idempotency:
--   The DO block reads the current constraint definition and only drops
--   + recreates if 'card' isn't already in it. On a database that
--   already has the wider constraint, this is a no-op. On prod (which
--   currently has the old narrow constraint), this widens it. Production
--   payments table is empty (verified 2026-05-09 via Supabase MCP), so
--   widening the constraint cannot violate any existing row.
--
-- Apply ordering: run after 007. Safe to apply against prod (no
-- existing rows can violate the new wider constraint).

DO $$
DECLARE
    def TEXT;
BEGIN
    SELECT pg_get_constraintdef(c.oid) INTO def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'payments'
      AND c.contype = 'c'
      AND c.conname = 'payments_payment_method_check';

    IF def IS NULL OR def NOT LIKE '%''card''%' THEN
        ALTER TABLE payments
            DROP CONSTRAINT IF EXISTS payments_payment_method_check;
        ALTER TABLE payments
            ADD CONSTRAINT payments_payment_method_check
            CHECK (payment_method IN (
                'mtn_money',
                'airtel_money',
                'card',
                'card_money',
                'lenco_mtn_money',
                'lenco_airtel_money',
                'lenco_card'
            ));
    END IF;
END $$;
