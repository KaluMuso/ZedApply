import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Zed CV - AI Job Matching for Zambia",
  description:
    "Find jobs that match your skills. AI-powered matching, CV generation, and WhatsApp delivery for Zambian professionals.",
  keywords: ["Zambia", "jobs", "CV", "AI matching", "career"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
