/** Apply button targets + analytics source for match/job cards (Track 4e). */

export type ApplyClickSource = "direct" | "source_fallback" | "enriched" | "description_email";

export interface ApplyJobFields {
  title: string;
  company?: string | null;
  apply_url?: string | null;
  apply_email?: string | null;
  contact_phone?: string | null;
  source_url?: string | null;
  apply_source?: string | null;
}

export interface ApplyAction {
  href: string;
  label: string;
  applySource: ApplyClickSource;
  external: boolean;
  secondary?: ApplyAction;
}

const SUPPORT_MAIL =
  "mailto:support@zedapply.com?subject=Help%20applying%20to%20a%20job";

function mailtoApply(email: string, job: ApplyJobFields): string {
  const subject = encodeURIComponent(`Application: ${job.title}`);
  const body = encodeURIComponent(
    `Dear hiring manager,\n\nI am writing to apply for the ${job.title} role${
      job.company ? ` at ${job.company}` : ""
    }.\n\nI found this opportunity on ZedApply and would welcome the chance to discuss my application.\n\nKind regards`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

function applySourceFromField(
  job: ApplyJobFields,
  field: "url" | "email"
): ApplyClickSource {
  if (job.apply_source === "description_email" || job.apply_source === "description_url") {
    return "description_email";
  }
  if (job.apply_source === "enriched") return "enriched";
  return field === "url" ? "direct" : "direct";
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("260") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+260${digits.slice(1)}`;
  if (digits.length === 9) return `+260${digits}`;
  return null;
}

/** Resolve primary apply affordance for compact job cards. */
export function resolveApplyAction(job: ApplyJobFields): ApplyAction | null {
  const hasUrl = Boolean(job.apply_url && /^https?:\/\//i.test(job.apply_url));
  const hasEmail = Boolean(job.apply_email?.trim());
  const phone = job.contact_phone ? normalizePhone(job.contact_phone) : null;

  if (hasUrl) {
    return {
      href: job.apply_url as string,
      label: "Apply on company site",
      applySource: applySourceFromField(job, "url"),
      external: true,
    };
  }

  if (hasEmail) {
    return {
      href: mailtoApply(job.apply_email as string, job),
      label: "Email application",
      applySource: applySourceFromField(job, "email"),
      external: false,
    };
  }

  if (phone) {
    return {
      href: `tel:${phone}`,
      label: "Call/WhatsApp",
      applySource: "direct",
      external: false,
      secondary: {
        href: `https://wa.me/${phone.replace(/\D/g, "")}`,
        label: "WhatsApp",
        applySource: "direct",
        external: true,
      },
    };
  }

  return null;
}

/** Legacy fallback when no structured contact exists (admin-only / stale clients). */
export function resolveApplyActionOrSupport(job: ApplyJobFields): ApplyAction {
  return (
    resolveApplyAction(job) ?? {
      href: SUPPORT_MAIL,
      label: "Contact Support",
      applySource: "source_fallback",
      external: false,
    }
  );
}
