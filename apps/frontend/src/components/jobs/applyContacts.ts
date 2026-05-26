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

/** Build apply contact rows for the Apply modal and job detail actions. */
export function buildApplyContactMethods(job: ApplyModalJob): ApplyContactMethod[] {
  const methods: ApplyContactMethod[] = [];
  const seen = new Set<string>();

  const push = (method: ApplyContactMethod) => {
    const key = `${method.kind}:${method.copyValue.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    methods.push(method);
  };

  const url = job.apply_url?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    push({
      kind: "website",
      label: "Apply on company site",
      display: url.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
      copyValue: url,
      href: url,
    });
  }

  const email = job.apply_email?.trim();
  if (email) {
    push({
      kind: "email",
      label: "Email application",
      display: email,
      copyValue: email,
      href: `mailto:${email}`,
    });
  }

  const phone =
    job.contact_phone && normalizeZambianPhone(job.contact_phone);

  if (phone) {
    const waDigits = phone.replace(/\D/g, "");
    push({
      kind: "phone",
      label: "Call",
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

  return methods;
}

/** True when the job has at least one listable apply channel in structured fields. */
export function hasStructuredApplyContact(job: ApplyModalJob): boolean {
  return buildApplyContactMethods(job).length > 0;
}
