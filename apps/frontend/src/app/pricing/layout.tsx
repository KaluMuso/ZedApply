import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple plans for Zambian job seekers — free tier, Starter, Professional, and Super Standard with WhatsApp match digests.",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
