import type { LencoPayGlobal, LencoPayOptions } from "@/types/lenco-pay";

const DEFAULT_LENCO_SCRIPT_URL =
  "https://pay.sandbox.lenco.co/js/v1/inline.js";

/** Inline widget script URL (Vercel: NEXT_PUBLIC_LENCO_WIDGET_URL or legacy SCRIPT_URL). */
export function getLencoScriptUrl(): string {
  const widget = process.env.NEXT_PUBLIC_LENCO_WIDGET_URL?.trim();
  if (widget) return widget;
  const script = process.env.NEXT_PUBLIC_LENCO_SCRIPT_URL?.trim();
  if (script) return script;
  return DEFAULT_LENCO_SCRIPT_URL;
}

export function getLencoPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_LENCO_PUBLIC_KEY?.trim();
  return key || null;
}

export function isLencoReady(): boolean {
  return typeof getLencoPay()?.getPaid === "function";
}

export function getLencoPay(): LencoPayGlobal | null {
  if (typeof window === "undefined") return null;
  const pay = window.LencoPay;
  if (!pay || typeof pay.getPaid !== "function") return null;
  return pay;
}

/** Merchant label read by the Lenco widget when set on `window` before checkout. */
export function setLencoMerchantLabel(label: string): void {
  if (typeof window !== "undefined") {
    window.label = label;
  }
}

export function lencoPhone(phone: string | null | undefined): string {
  const raw = (phone || "").trim();
  if (!raw) return "0961111111";
  if (raw.startsWith("+260")) return `0${raw.slice(4)}`;
  if (raw.startsWith("260")) return `0${raw.slice(3)}`;
  if (raw.startsWith("0")) return raw;
  return `0${raw}`;
}

export function openLencoCheckout(options: LencoPayOptions): void {
  const lenco = getLencoPay();
  if (!lenco) {
    throw new TypeError("LencoPay.getPaid is not available");
  }
  if (!Number.isFinite(options.amount) || options.amount <= 0) {
    throw new TypeError(`Invalid Lenco amount: ${String(options.amount)}`);
  }
  lenco.getPaid(options);
}
