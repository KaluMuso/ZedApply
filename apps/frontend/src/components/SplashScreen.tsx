"use client";

import { useEffect, useState } from "react";

/**
 * PWA Splash Screen — matches the ZedApply mobile prototype.
 * Green gradient background, copper "Z" logo with scale+rotate animation,
 * orbiting dots, tagline, and loading bar.
 *
 * Shows on first load, then fades out after the loading bar completes.
 */
export function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");

  useEffect(() => {
    // Loading bar fills over 1100ms, then fade out starts at 1700ms
    const fadeTimer = setTimeout(() => setPhase("fading"), 1700);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 2300); // 1700ms wait + 600ms fade

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={`splash-screen ${phase === "fading" ? "splash-fading" : ""}`}
      aria-hidden="true"
    >
      {/* Orbiting dots */}
      <div className="splash-orbit splash-orbit-1" />
      <div className="splash-orbit splash-orbit-2" />

      {/* Logo */}
      <div className="splash-logo">Z</div>

      {/* Tagline */}
      <div className="splash-tagline">ZedApply &middot; Jobs that find you</div>

      {/* Loading bar */}
      <div className="splash-bar">
        <div className="splash-bar-fill" />
      </div>

      <style jsx>{`
        .splash-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          background: radial-gradient(
            ellipse at 30% 20%,
            #1a6f4c 0%,
            #0a3a23 60%,
            #052918 100%
          );
          overflow: hidden;
        }

        .splash-fading {
          animation: splashFadeOut 600ms cubic-bezier(0.4, 0, 0.7, 0.3) forwards;
        }

        @keyframes splashFadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(1.05);
            visibility: hidden;
          }
        }

        /* Orbiting copper dots */
        .splash-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 4px;
          height: 4px;
          background: #eda56e;
          border-radius: 50%;
          box-shadow: 0 0 20px #d27a3f;
          opacity: 0.6;
        }

        .splash-orbit-1 {
          animation: orbit 3s linear infinite;
        }

        .splash-orbit-2 {
          animation: orbit 4.5s linear infinite reverse;
        }

        @keyframes orbit {
          from {
            transform: rotate(0deg) translateX(80px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateX(80px) rotate(-360deg);
          }
        }

        /* Z Logo — scale + rotate entrance */
        .splash-logo {
          font-family: "Instrument Serif", "Times New Roman", serif;
          font-style: italic;
          font-size: clamp(100px, 25vw, 130px);
          line-height: 1;
          letter-spacing: -0.06em;
          color: #eda56e;
          text-shadow: 0 4px 24px rgba(237, 165, 110, 0.4);
          position: relative;
          animation: logoIn 800ms cubic-bezier(0.2, 1.4, 0.5, 1) both;
        }

        @keyframes logoIn {
          from {
            opacity: 0;
            transform: scale(0.6) rotate(-8deg);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0);
            filter: blur(0);
          }
        }

        /* Tagline */
        .splash-tagline {
          margin-top: 14px;
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          color: rgba(237, 165, 110, 0.7);
          animation: logoIn 700ms 200ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }

        /* Loading bar */
        .splash-bar {
          margin-top: 32px;
          width: 140px;
          height: 2px;
          background: rgba(237, 165, 110, 0.15);
          border-radius: 999px;
          overflow: hidden;
        }

        .splash-bar-fill {
          height: 100%;
          width: 0;
          background: linear-gradient(
            90deg,
            transparent,
            #eda56e,
            transparent
          );
          background-size: 200% 100%;
          animation: barFill 1100ms 200ms cubic-bezier(0.5, 0, 0.5, 1) forwards,
            barShimmer 1.4s 200ms ease infinite;
        }

        @keyframes barFill {
          to {
            width: 100%;
          }
        }

        @keyframes barShimmer {
          from {
            background-position: -200% 0;
          }
          to {
            background-position: 200% 0;
          }
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .splash-logo,
          .splash-tagline,
          .splash-bar-fill,
          .splash-orbit-1,
          .splash-orbit-2 {
            animation-duration: 0.01ms !important;
          }
          .splash-fading {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
