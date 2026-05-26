import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Interview Prep",
  description: "Mock interviews and aptitude practice for Super Standard subscribers.",
});

export default function InterviewPrepLayout({ children }: { children: React.ReactNode }) {
  return children;
}
