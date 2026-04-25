const PREFIX = "+260";
const ZAM_DIGITS = 9; // 9 after country

/** Normalizes to +260XXXXXXXXX */
export function toE164(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("260") && d.length >= 12) {
    return `+${d.slice(0, 12)}`;
  }
  if (d.length >= ZAM_DIGITS) {
    const local = d.slice(-ZAM_DIGITS);
    return `${PREFIX}${local}`;
  }
  if (d.length > 0 && d.length < ZAM_DIGITS) {
    return `${PREFIX}${d.padStart(ZAM_DIGITS, "0")}`;
  }
  return PREFIX;
}

/** Spaced for display: +260 9XX XXX XXX (best-effort) */
export function formatPhoneDisplay(phone: string): string {
  if (!phone.startsWith(PREFIX) || phone.length < 4) {
    return phone;
  }
  const rest = phone.replace(/\D/g, "").replace(/^260/, "");
  if (rest.length < 2) {
    return PREFIX;
  }
  const a = rest.slice(0, 1);
  const b = rest.slice(1, 3);
  const c = rest.slice(3, 6);
  const d = rest.slice(6, 9);
  const parts = [PREFIX, a + b, c, d].filter((p) => p.length);
  return parts.join(" ");
}

export function isValidZambianPhone(phone: string): boolean {
  return /^\+260[0-9]{9}$/.test(phone.trim());
}
