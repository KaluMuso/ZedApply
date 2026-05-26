import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { NotificationsSection } from "../_sections/NotificationsSection";

export const metadata: Metadata = pageMetadata({
  title: "Notifications",
  description: "WhatsApp and email digest preferences on Zed Apply.",
});

export default function SettingsNotificationsPage() {
  return <NotificationsSection />;
}
