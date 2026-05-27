-- 076: Employer portal — B2B candidate search, consent-gated contact, subscriptions.

CREATE TABLE employers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  industry text,
  size_band text CHECK (size_band IN ('1-10','11-50','51-200','201-1000','1000+')),
  website text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW()
);

CREATE INDEX idx_employers_company_name ON employers (lower(company_name));

CREATE TABLE employer_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','recruiter','viewer')),
  invited_at timestamptz DEFAULT NOW(),
  accepted_at timestamptz,
  invite_email text,
  UNIQUE(employer_id, user_id)
);

CREATE INDEX idx_employer_users_user ON employer_users (user_id);
CREATE INDEX idx_employer_users_employer ON employer_users (employer_id);

ALTER TABLE employer_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY eu_self ON employer_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE employer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('lite','pro')),
  status text NOT NULL CHECK (status IN ('active','past_due','cancelled')),
  current_period_end timestamptz NOT NULL,
  contacts_used_this_period integer DEFAULT 0,
  lenco_subscription_ref text,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE (employer_id)
);

CREATE INDEX idx_employer_subscriptions_status ON employer_subscriptions (employer_id, status);

CREATE TABLE candidate_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  initiated_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','both')),
  sent_at timestamptz,
  candidate_responded_at timestamptz,
  candidate_consented boolean,
  created_at timestamptz DEFAULT NOW(),
  expires_at timestamptz DEFAULT (NOW() + interval '7 days')
);

CREATE INDEX idx_ccr_employer ON candidate_contact_requests (employer_id, created_at DESC);
CREATE INDEX idx_ccr_candidate ON candidate_contact_requests (candidate_user_id);
CREATE INDEX idx_ccr_pending ON candidate_contact_requests (candidate_user_id, candidate_consented)
  WHERE candidate_consented IS NULL AND sent_at IS NOT NULL;

ALTER TABLE candidate_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccr_employer ON candidate_contact_requests FOR SELECT TO authenticated
  USING (
    employer_id IN (
      SELECT employer_id FROM employer_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ccr_candidate ON candidate_contact_requests FOR SELECT TO authenticated
  USING (candidate_user_id = auth.uid());

CREATE TABLE cv_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_id uuid REFERENCES cvs(id) ON DELETE SET NULL,
  accessed_at timestamptz DEFAULT NOW(),
  ip inet
);

CREATE INDEX idx_cv_access_audit_employer ON cv_access_audit (employer_user_id, accessed_at DESC);

COMMENT ON TABLE employers IS 'B2B employer accounts (ZedApply Employer portal).';
COMMENT ON TABLE employer_subscriptions IS 'Employer Lite (5 contacts/mo) or Pro (unlimited); amounts in app code as ngwee.';
COMMENT ON COLUMN candidate_contact_requests.candidate_consented IS
  'NULL=pending, true=YES on WhatsApp/email, false=NO or expired after 7 days.';
