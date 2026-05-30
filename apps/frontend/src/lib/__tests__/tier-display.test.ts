import { describe, expect, it } from "vitest";
import { formatTierNavSubtitle } from "../tier-display";

describe("formatTierNavSubtitle", () => {
  it("shows tier with match usage", () => {
    expect(formatTierNavSubtitle("starter", 12, 50)).toBe(
      "Starter · 12 of 50 matches",
    );
  });

  it("shows unlimited for super tier", () => {
    expect(formatTierNavSubtitle("super_standard", 100, 99999)).toContain(
      "Super Standard",
    );
  });

  it("returns label only when matchesLimit is omitted", () => {
    expect(formatTierNavSubtitle("professional")).toBe("Professional");
  });

  it("falls back to humanized tier slug for unknown tiers", () => {
    expect(formatTierNavSubtitle("legacy_tier", 0, 10)).toBe(
      "legacy tier · 0 of 10 matches",
    );
  });

  it("shows unlimited wording without usage counts for super tier", () => {
    expect(formatTierNavSubtitle("super_standard", 5, 99999)).toBe(
      "Super Standard · unlimited matches",
    );
  });
});
