import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = pageMetadata({
  title: "CV Builder",
  description: "Tailor your CV and cover letter for a specific job with AI-assisted editing.",
});

/** Wider canvas for the split-pane CV builder (parent (app) layout caps at 5xl). */
export default function CvBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-[min(100vw,1280px)] max-w-none px-4 sm:px-6">
      {children}
    </div>
  );
}
