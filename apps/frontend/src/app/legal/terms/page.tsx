import type { Metadata } from "next";
import { legalPageMetadata } from "@/lib/site-metadata";
import { LegalMarkdown } from "../_components/LegalMarkdown";
import { fetchLegalDocFromDB } from "../_fetch";
import { TERMS_MARKDOWN, LAST_UPDATED, VERSION } from "./_content";

// task #62 — see /legal/privacy/page.tsx for the DB-fallback rationale.
export const revalidate = 300;

export const metadata: Metadata = legalPageMetadata({
  title: "Terms of Service",
  description:
    "The terms governing your use of Zed Apply — eligibility, paid tiers, acceptable use, and dispute resolution under Zambian law.",
  modifiedTime: LAST_UPDATED,
  version: VERSION,
});

export default async function TermsPage() {
  const dbDoc = await fetchLegalDocFromDB("terms");
  const markdown = dbDoc?.content_md || TERMS_MARKDOWN;
  return <LegalMarkdown markdown={markdown} />;
}
