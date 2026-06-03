"use client";

import { useEffect, useRef } from "react";
import { cv as cvApi, profile as profileApi } from "@/lib/api";
import { parseGeneratedCv } from "@/app/profile/_tabs/generator/parseCv";
import { mapParsedCvToDraft } from "./mapParsedCvToDraft";
import { useTailoredCvBuilderStore } from "./store";

/** Strip markdown heading markers so parseGeneratedCv can section the body. */
function normalizeMarkdownForParse(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

/**
 * When opened from a match-tailored CV (generationId query param), load
 * stored markdown into the builder draft instead of the profile CV.
 */
export function useHydrateBuilderFromGeneration(
  token: string | null,
  generationId: string | null,
) {
  const setDraft = useTailoredCvBuilderStore((s) => s.setDraft);
  const hydratedFromGeneration = useTailoredCvBuilderStore(
    (s) => s.hydratedFromGeneration,
  );
  const ranRef = useRef(false);

  useEffect(() => {
    if (!token || !generationId || ranRef.current || hydratedFromGeneration) {
      return;
    }
    ranRef.current = true;

    let cancelled = false;
    Promise.all([
      cvApi.getGeneration(token, generationId),
      profileApi.get(token).catch(() => null),
    ])
      .then(([gen, prof]) => {
        if (cancelled) return;
        const text = normalizeMarkdownForParse(gen.content || "");
        if (!text) return;
        const parsed = parseGeneratedCv(text);
        const mapped = mapParsedCvToDraft(parsed);
        if (mapped.skills.length === 0 && prof?.skills?.length) {
          mapped.skills = [...prof.skills];
        }
        if (gen.job_title) {
          mapped.basics.headline = gen.job_title;
        }
        setDraft(mapped, { fromGeneration: true });
        useTailoredCvBuilderStore.getState().setStep("basics");
      })
      .catch(() => {
        /* keep sample draft */
      });

    return () => {
      cancelled = true;
    };
  }, [token, generationId, hydratedFromGeneration, setDraft]);
}
