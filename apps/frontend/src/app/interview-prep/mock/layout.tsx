import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Mock Interview",
  description: "Practice interview questions tailored to your target role.",
});

export default function MockInterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
