"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const DISMISS_KEY = "zedapply_pwa_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  useEffect(() => {
    if (!deferred) return;
    if (pathname !== "/matches") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setVisible(true);
  }, [deferred, pathname]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") dismiss();
    else setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[calc(var(--mobile-tabbar-offset)+12px)] left-4 right-4 z-[60] mx-auto max-w-lg rounded-sm border border-line bg-surface p-4 shadow-lg md:bottom-6"
      role="region"
      aria-label="Install ZedApply"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install ZedApply</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add to your home screen for faster access and offline browsing.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => void install()}>
              Install
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="touch-target inline-flex shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          aria-label="Dismiss install prompt"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
