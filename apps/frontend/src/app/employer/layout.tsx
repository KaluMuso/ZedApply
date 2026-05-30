import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Employer",
  description: "Zed Apply employer portal — search candidates with consent.",
});

export default function EmployerRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
