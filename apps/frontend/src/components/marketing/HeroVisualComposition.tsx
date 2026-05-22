"use client";

import { ApplyChannelsDetectedCard } from "@/components/marketing/ApplyChannelsDetectedCard";
import { FloatingCard } from "@/components/marketing/FloatingCard";
import { HeroCvPreviewCard } from "@/components/marketing/HeroCvPreviewCard";
import { WhatsAppDigestCard } from "@/components/marketing/WhatsAppDigestCard";

/** Angled floating hero canvas: CV preview, WhatsApp digest, apply channels. */
export function HeroVisualComposition() {
  return (
    <div
      className="relative mx-auto flex min-h-[420px] w-full max-w-[440px] items-center justify-center sm:min-h-[460px] lg:mx-0 lg:max-w-none"
      aria-hidden={false}
    >
      <FloatingCard
        variant="default"
        className="absolute left-0 top-6 z-0 -rotate-6 sm:left-2 sm:top-4"
      >
        <HeroCvPreviewCard />
      </FloatingCard>

      <FloatingCard
        variant="delayed"
        className="relative z-10 ml-auto mt-2 rotate-3 sm:mr-0 sm:mt-0"
      >
        <WhatsAppDigestCard />
      </FloatingCard>

      <FloatingCard
        variant="delayed-2"
        className="absolute bottom-0 right-0 z-20 rotate-2 sm:-bottom-2 sm:right-4"
      >
        <ApplyChannelsDetectedCard />
      </FloatingCard>
    </div>
  );
}
