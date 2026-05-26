import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";
import { JobPreferencesSection } from "../_sections/JobPreferencesSection";

export const metadata: Metadata = pageMetadata({
  title: "Job Preferences",
  description: "Target roles, salary, and work arrangement preferences for matching.",
});

export default function SettingsJobPreferencesPage() {
  return <JobPreferencesSection />;
}
