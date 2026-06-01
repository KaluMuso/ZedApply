-- 092: Admin-editable Bwana chatbot platform contact, templates, and escalation log.

BEGIN;

CREATE TYPE public.bwana_escalation_reason AS ENUM (
    'human_request',
    'unsatisfied',
    'contact_admin'
);

CREATE TABLE public.bwana_platform_config (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    chatbot_display_name text NOT NULL DEFAULT 'Bwana',
    operator_display_name text NOT NULL DEFAULT 'ZedApply Support',
    support_email text NOT NULL,
    support_phone text NOT NULL,
    escalation_whatsapp_phone text NOT NULL,
    escalation_sla_hours int NOT NULL DEFAULT 24 CHECK (escalation_sla_hours > 0),
    human_escalation_reply_template text NOT NULL,
    unsatisfied_reply_template text NOT NULL,
    contact_admin_reply_template text NOT NULL,
    public_knowledge_extra text NOT NULL DEFAULT '' CHECK (char_length(public_knowledge_extra) <= 2000),
    enable_email_escalation boolean NOT NULL DEFAULT true,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES public.users(id)
);

COMMENT ON TABLE public.bwana_platform_config IS
    'Singleton Bwana chatbot contact + escalation settings (no API keys or ingest secrets).';

CREATE TABLE public.bwana_escalation_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    session_id text,
    message_excerpt text NOT NULL,
    reason public.bwana_escalation_reason NOT NULL,
    channels text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bwana_escalation_log_user_created
    ON public.bwana_escalation_log (user_id, created_at DESC);

ALTER TABLE public.bwana_platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bwana_escalation_log ENABLE ROW LEVEL SECURITY;

-- Service-role only: backend reads/writes; no anon/authenticated policies.

INSERT INTO public.bwana_platform_config (
    id,
    support_email,
    support_phone,
    escalation_whatsapp_phone,
    human_escalation_reply_template,
    unsatisfied_reply_template,
    contact_admin_reply_template
) VALUES (
    1,
    'convergeozambia@gmail.com',
    '+260761359005',
    '+260761359005',
    'I''ve flagged this for {operator}. You should hear back on WhatsApp within {sla} hours. You can also email {email} or call {phone}.',
    'Sorry this wasn''t helpful. I''ve alerted {operator} — they''ll follow up within {sla} hours. Reach us anytime at {email} or {phone}.',
    'Contact {operator}: email {email} or call {phone}. We aim to respond within {sla} hours on business days.'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
