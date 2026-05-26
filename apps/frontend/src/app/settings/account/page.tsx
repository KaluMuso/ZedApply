import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { AccountSection } from "../_sections/AccountSection";

export const metadata: Metadata = pageMetadata({
  title: "Account",
  description: "Update your contact details on Zed Apply.",
});

export default function SettingsAccountPage() {
  return <AccountSection />;
}
