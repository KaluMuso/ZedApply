import type { Metadata } from "next";
import { legalPageMetadata } from "@/lib/site-metadata";
import { LegalMarkdown } from "../_components/LegalMarkdown";
import { fetchLegalDocFromDB } from "../_fetch";
import { COOKIES_MARKDOWN, LAST_UPDATED, VERSION } from "./_content";

// task #62 — see /legal/privacy/page.tsx for the DB-fallback rationale.
export const revalidate = 300;

export const metadata: Metadata = legalPageMetadata({
  title: "Cookie Policy",
  description:
    "Which cookies Zed Apply uses, what they do, and how to control them.",
  modifiedTime: LAST_UPDATED,
  version: VERSION,
});

export default async function CookiesPage() {
  const dbDoc = await fetchLegalDocFromDB("cookies");
  const markdown = dbDoc?.content_md || COOKIES_MARKDOWN;
  return <LegalMarkdown markdown={markdown} />;
}
