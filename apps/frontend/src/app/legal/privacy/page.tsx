import type { Metadata } from "next";
import { legalPageMetadata } from "@/lib/site-metadata";
import { LegalMarkdown } from "../_components/LegalMarkdown";
import { fetchLegalDocFromDB } from "../_fetch";
import { PRIVACY_MARKDOWN, LAST_UPDATED, VERSION } from "./_content";

// task #62 — DB-fallback render. The admin WYSIWYG saves to legal_docs;
// the public GET endpoint returns 404 when no row exists, in which case
// we render the inline _content.ts constant. Revalidate every 5 min so
// an edit propagates promptly; the admin save handler also fires an
// explicit revalidatePath() so the change is visible within seconds.
export const revalidate = 300;

export const metadata: Metadata = legalPageMetadata({
  title: "Privacy Policy",
  description:
    "How Zed Apply collects, uses and protects your personal data, in compliance with the Zambia Data Protection Act, 2021.",
  modifiedTime: LAST_UPDATED,
  version: VERSION,
});

export default async function PrivacyPage() {
  const dbDoc = await fetchLegalDocFromDB("privacy");
  // Prefer DB content when it exists. content_md is the source of
  // truth for the LegalMarkdown renderer (consistent rehype-sanitize
  // path with the inline-content fallback).
  const markdown = dbDoc?.content_md || PRIVACY_MARKDOWN;
  return <LegalMarkdown markdown={markdown} />;
}
