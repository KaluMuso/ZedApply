"use client";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "./analytics-placeholder";
import { RegisterServiceWorker } from "./register-service-worker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delay={200}>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <RegisterServiceWorker />
        <Analytics />
      </TooltipProvider>
    </ThemeProvider>
  );
}
