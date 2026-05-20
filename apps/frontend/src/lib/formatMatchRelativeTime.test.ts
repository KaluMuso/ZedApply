import { describe, expect, it } from "vitest";
import { formatMatchRelativeTime } from "./formatMatchRelativeTime";

const NOW = new Date("2026-05-20T15:00:00");

describe("formatMatchRelativeTime", () => {
  it("returns null for missing or invalid input", () => {
    expect(formatMatchRelativeTime(null, NOW)).toBeNull();
    expect(formatMatchRelativeTime(undefined, NOW)).toBeNull();
    expect(formatMatchRelativeTime("not-a-date", NOW)).toBeNull();
  });

  it('returns "Matched today" for same calendar day', () => {
    expect(
      formatMatchRelativeTime("2026-05-20T08:30:00", NOW)
    ).toBe("Matched today");
  });

  it('returns "Matched yesterday" for previous calendar day', () => {
    expect(
      formatMatchRelativeTime("2026-05-19T23:59:00", NOW)
    ).toBe("Matched yesterday");
  });

  it("returns Nd ago for older matches", () => {
    expect(
      formatMatchRelativeTime("2026-05-18T12:00:00", NOW)
    ).toBe("Matched 2d ago");
    expect(
      formatMatchRelativeTime("2026-05-15T12:00:00", NOW)
    ).toBe("Matched 5d ago");
  });

  it("returns null for future timestamps", () => {
    expect(
      formatMatchRelativeTime("2026-05-21T12:00:00", NOW)
    ).toBeNull();
  });
});
