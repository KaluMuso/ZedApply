"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "./SplashScreen";

/**
 * PWA Provider — handles service worker registration and splash screen.
 * Wraps children and shows splash on initial load.
 */
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Register service worker
  useEffect(() => {
    const isDev =
      typeof window !== "undefined" &&
      /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(window.location.hostname);

    if (!isDev && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — app still works, just no offline support
      });
    }
  }, []);

  // Mark app as ready after a brief hydration window
  useEffect(() => {
    const timer = setTimeout(() => setAppReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
      <div
        style={{
          opacity: appReady && !showSplash ? 1 : 0,
          transition: "opacity 300ms ease",
        }}
      >
        {children}
      </div>
    </>
  );
}
