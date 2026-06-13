import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/site-metadata";
import TendersPageClient from "./TendersPageClient";

export const metadata: Metadata = pageMetadata({
  title: "Tenders",
  description:
    "Match your business profile against active procurement opportunities and corporate tenders in Zambia.",
});

export default function TendersPage() {
  return (
    <Suspense fallback={null}>
      <TendersPageClient />
    </Suspense>
  );
}
