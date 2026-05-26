import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Get in touch with the Zed Apply team — support, partnerships, and feedback.",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
