"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/zustand-store";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [ready, setReady] = useState(false);
  const { online, setOnline } = useAppStore();

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    setReady(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline]);

  if (!ready || online) {
    return null;
  }

  return (
    <div
      className={cn("sticky top-0 z-50 w-full border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100")}
      role="status"
      aria-live="polite"
    >
      <p className="max-w-7xl mx-auto flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>You are offline. Some content may be cached. Check your connection to submit forms.</span>
      </p>
    </div>
  );
}
