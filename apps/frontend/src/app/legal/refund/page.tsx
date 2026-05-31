import type { Metadata } from "next";
import { legalPageMetadata } from "@/lib/site-metadata";
import { LegalMarkdown } from "../_components/LegalMarkdown";
import { fetchLegalDocFromDB } from "../_fetch";
import { REFUND_MARKDOWN, LAST_UPDATED, VERSION } from "./_content";

export const revalidate = 300;

export const metadata: Metadata = legalPageMetadata({
  title: "Refund Policy",
  description:
    "Zed Apply refund rules — 7-day money-back guarantee, Lenco and DPO Pay billing, and how to request a refund.",
  modifiedTime: LAST_UPDATED,
  version: VERSION,
});

export default async function RefundPage() {
  const dbDoc = await fetchLegalDocFromDB("refund");
  const markdown = dbDoc?.content_md || REFUND_MARKDOWN;
  return <LegalMarkdown markdown={markdown} />;
}
