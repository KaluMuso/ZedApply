import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { PrivacySection } from "../_sections/PrivacySection";

export const metadata: Metadata = pageMetadata({
  title: "Privacy & Data",
  description: "Export your data and read Zed Apply privacy policies.",
});

export default function SettingsPrivacyPage() {
  return <PrivacySection />;
}
