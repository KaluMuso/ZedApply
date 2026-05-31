import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Security & Data Protection",
  description:
    "How Zed Apply protects your CV, personal data, and payments — built for Zambian professionals.",
});

const TRUST_POINTS = [
  {
    title: "Encryption in transit and at rest",
    body: "CVs and account data are encrypted over TLS. Sensitive fields are encrypted at rest in our database.",
  },
  {
    title: "Passwordless sign-in",
    body: "OTP via WhatsApp or email reduces phishing risk — no shared passwords to leak.",
  },
  {
    title: "You control your data",
    body: "Export or delete your account from Settings. We do not sell your CV to employers without consent.",
  },
  {
    title: "Zambia Data Protection Act",
    body: "We design flows to align with the Zambia Data Protection Act 2021 and publish clear privacy notices.",
  },
  {
    title: "Secure payments",
    body: "Paid plans use Lenco (MTN MoMo, Airtel Money, card). ZedApply never stores your card PIN or mobile money PIN.",
  },
  {
    title: "Access controls",
    body: "Production access is limited to verified operators. Admin actions are restricted to internal roles.",
  },
] as const;

export default function SecurityPage() {
  return (
    <main className="max-w-[860px] mx-auto px-5 sm:px-6 py-12 sm:py-16">
      <p className="eyebrow mb-3">Trust</p>
      <h1 className="type-h1 mb-4" style={{ color: "var(--ink)" }}>
        Security &amp; data protection
      </h1>
      <p className="type-body mb-10 max-w-2xl" style={{ color: "var(--muted)" }}>
        ZedApply is built in Zambia for Zambian job seekers. Your CV and contact details are
        load-bearing — we treat them accordingly.
      </p>

      <ul className="space-y-6 mb-12">
        {TRUST_POINTS.map((point) => (
          <li
            key={point.title}
            className="rounded-xl border p-5 sm:p-6"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="flex gap-3">
              <Icon name="shield" size={20} className="shrink-0 text-primary mt-0.5" />
              <div>
                <h2 className="type-h3 mb-1" style={{ color: "var(--ink)" }}>
                  {point.title}
                </h2>
                <p className="type-caption m-0">{point.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}
      >
        <p className="type-body mb-4" style={{ color: "var(--ink-2)" }}>
          Read our full legal notices or reach the team if you have a security question.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/legal/privacy" className="btn btn-outline btn-sm">
            Privacy Policy
          </Link>
          <Link href="/contact" className="btn btn-primary btn-sm">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
