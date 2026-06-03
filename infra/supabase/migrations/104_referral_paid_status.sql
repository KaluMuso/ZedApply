-- 104: Referral funnel — signed_up → qualified (optional CV) → paid → rewarded.

ALTER TABLE public.referral_events
  DROP CONSTRAINT IF EXISTS referral_events_status_check;

ALTER TABLE public.referral_events
  ADD CONSTRAINT referral_events_status_check
  CHECK (status IN ('signed_up', 'qualified', 'paid', 'rewarded'));

ALTER TABLE public.referral_events
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.referral_events.paid_at IS
  'When the referred user completed their first paid subscription (webhook-confirmed).';

COMMENT ON TABLE public.referral_events IS
  'Referral funnel: signed_up at invite signup; qualified on optional CV upload; paid + rewarded on first paid tier activation.';
