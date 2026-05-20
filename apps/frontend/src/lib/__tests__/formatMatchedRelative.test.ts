import { describe, expect, it } from "vitest";
import { formatMatchedRelative } from "../formatMatchedRelative";

describe("formatMatchedRelative", () => {
  it("returns today when the stamp is the same local calendar day", () => {
    const now = new Date(2026, 4, 20, 18, 0, 0);
    const iso = new Date(2026, 4, 20, 8, 15, 0).toISOString();
    expect(formatMatchedRelative(iso, now)).toBe("Matched today");
  });

  it("returns yesterday for the previous local calendar day", () => {
    const now = new Date(2026, 4, 20, 12, 0, 0);
    const iso = new Date(2026, 4, 19, 22, 0, 0).toISOString();
    expect(formatMatchedRelative(iso, now)).toBe("Matched yesterday");
  });

  it("uses multi-day wording in the 2–6 day window", () => {
    const now = new Date(2026, 4, 20, 12, 0, 0);
    const iso = new Date(2026, 4, 17, 10, 0, 0).toISOString();
    expect(formatMatchedRelative(iso, now)).toBe("Matched 3 days ago");
  });

  it("uses compact Nd ago for longer spans within two weeks", () => {
    const now = new Date(2026, 4, 20, 12, 0, 0);
    const iso = new Date(2026, 4, 10, 10, 0, 0).toISOString();
    expect(formatMatchedRelative(iso, now)).toBe("Matched 10d ago");
  });

  it("returns empty string for invalid ISO input", () => {
    expect(formatMatchedRelative("not-a-date", new Date())).toBe("");
  });
});
