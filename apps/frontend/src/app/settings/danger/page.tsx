import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { DangerSection } from "../_sections/DangerSection";

export const metadata: Metadata = pageMetadata({
  title: "Danger Zone",
  description: "Pause matching or permanently delete your Zed Apply account.",
});

export default function SettingsDangerPage() {
  return <DangerSection />;
}
