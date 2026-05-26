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
});
