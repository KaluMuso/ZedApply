import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { BillingSection } from "../_sections/BillingSection";

export const metadata: Metadata = pageMetadata({
  title: "Billing",
  description: "Your Zed Apply plan and upgrade options.",
});

export default function SettingsBillingPage() {
  return <BillingSection />;
}
