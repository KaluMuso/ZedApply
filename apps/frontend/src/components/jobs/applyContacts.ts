/** Minimal job fields needed by the Apply modal (matches list + full job detail). */
export interface ApplyModalJob {
  title: string;
  company?: string | null;
  apply_url?: string | null;
  apply_email?: string | null;
  description?: string | null;
  application_instructions?: string | null;
  contact_phone?: string | null;
}

export type ApplyContactKind = "email" | "whatsapp" | "phone" | "website";

export interface ApplyContactMethod {
  kind: ApplyContactKind;
  label: string;
  display: string;
  copyValue: string;
  href?: string;
}

const PHONE_RE =
  /(?:\+260|0)[\s.-]?(?:\d[\s.-]?){8}\d|\+260\d{9}|0\d{9}/gi;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function normalizeZambianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("260") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+260${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+260${digits}`;
  }
  return null;
}

function extractPhoneFromText(text: string): string | null {
  const matches = text.match(PHONE_RE);
  if (!matches) return null;
  for (const m of matches) {
    const normalized = normalizeZambianPhone(m);
    if (normalized) return normalized;
  }
  return null;
}

/** Build deduplicated apply contact rows for the Apply modal. */
export function buildApplyContactMethods(job: ApplyModalJob): ApplyContactMethod[] {
  const methods: ApplyContactMethod[] = [];
  const seen = new Set<string>();

  const push = (method: ApplyContactMethod) => {
    const key = `${method.kind}:${method.copyValue.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    methods.push(method);
  };

  const email = job.apply_email?.trim();
  if (email) {
    push({
      kind: "email",
      label: "Email",
      display: email,
      copyValue: email,
      href: `mailto:${email}`,
    });
  }

  const url = job.apply_url?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    push({
      kind: "website",
      label: "Website",
      display: url.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
      copyValue: url,
      href: url,
    });
  }

  const phone =
    (job.contact_phone && normalizeZambianPhone(job.contact_phone)) ||
    extractPhoneFromText(
      [job.description, job.application_instructions].filter(Boolean).join("\n"),
    );

  if (phone) {
    const waDigits = phone.replace(/\D/g, "");
    push({
      kind: "phone",
      label: "Phone",
      display: phone,
      copyValue: phone,
      href: `tel:${phone}`,
    });
    push({
      kind: "whatsapp",
      label: "WhatsApp",
      display: phone,
      copyValue: phone,
      href: `https://wa.me/${waDigits}`,
    });
  }

  if (methods.length === 0) {
    const hay = [job.description, job.application_instructions]
      .filter(Boolean)
      .join("\n");
    const extraEmail = hay.match(EMAIL_RE)?.[0];
    if (extraEmail && !email) {
      push({
        kind: "email",
        label: "Email",
        display: extraEmail,
        copyValue: extraEmail,
        href: `mailto:${extraEmail}`,
      });
    }
  }

  return methods;
}
