import { describe, expect, it } from "vitest";
import {
  FREE_TIER_MATCHES_DEFAULT,
  FREE_TIER_WELCOME_MATCHES,
  freeTierMatchesBlurb,
  freeTierMatchesFeatureLine,
  tierMatchesFaqAnswer,
} from "../tier-marketing";

describe("tier-marketing", () => {
  it("uses backend-aligned free tier limits", () => {
    expect(FREE_TIER_MATCHES_DEFAULT).toBe(3);
    expect(FREE_TIER_WELCOME_MATCHES).toBe(7);
  });

  it("consistent copy across surfaces", () => {
    expect(freeTierMatchesFeatureLine()).toContain("3 job matches");
    expect(freeTierMatchesFeatureLine()).toContain("7");
    expect(freeTierMatchesBlurb()).toContain("3 matches");
    expect(tierMatchesFaqAnswer()).toContain("3 per month");
  });
});
