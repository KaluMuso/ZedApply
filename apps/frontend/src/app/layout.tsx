import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import NextTopLoader from "nextjs-toploader";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Zed CV - AI Job Matching for Zambia",
  description:
    "Find jobs that match your skills. AI-powered matching, CV generation, and WhatsApp delivery for Zambian professionals.",
  keywords: ["Zambia", "jobs", "CV", "AI matching", "career", "Lusaka", "WhatsApp"],
  openGraph: {
    type: "website",
    locale: "en_ZM",
    siteName: "Zed CV",
    title: "Zed CV — AI job matching for Zambia",
    description: "Get matched to roles across Zambia. Results and alerts on WhatsApp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zed CV — AI job matching for Zambia",
    description: "Get matched to roles across Zambia. Results and alerts on WhatsApp.",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Zed CV" },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0fdf4" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(inter.className, inter.variable)} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased bg-background text-foreground flex flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:px-3 focus:py-2 focus:bg-primary focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <AppProviders>
            <NextTopLoader
              color="#166534"
              height={3}
              showSpinner={false}
              initialPosition={0.08}
            />
            <OfflineBanner />
            <Navbar />
            <main
              id="content"
              className="w-full min-h-[50vh] flex-1"
              role="main"
            >
              {children}
            </main>
            <Footer />
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
