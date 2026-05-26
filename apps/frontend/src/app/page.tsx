import type { Metadata } from "next";
import { SITE_DEFAULT_DESCRIPTION, SITE_DEFAULT_TITLE } from "@/lib/site-metadata";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: { absolute: SITE_DEFAULT_TITLE },
  description: SITE_DEFAULT_DESCRIPTION,
};

export default function HomePage() {
  return <HomePageClient />;
}
