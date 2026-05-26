import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { SettingsShell } from "./_components/SettingsShell";

export const metadata: Metadata = pageMetadata({
  title: "Settings",
  description: "Account, notifications, job preferences, billing, and privacy for Zed Apply.",
});

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
