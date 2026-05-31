import type { Metadata } from "next";
import { HomeStructuredData } from "@/components/marketing/HomeStructuredData";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  SITE_OG_DESCRIPTION,
  SITE_OG_IMAGE_PATH,
  SITE_URL,
} from "@/lib/site-metadata";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: { absolute: SITE_DEFAULT_TITLE },
  description: SITE_DEFAULT_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_OG_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    images: [{ url: SITE_OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_DEFAULT_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_OG_DESCRIPTION,
    images: [SITE_OG_IMAGE_PATH],
  },
};

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <HomePageClient />
    </>
  );
}
