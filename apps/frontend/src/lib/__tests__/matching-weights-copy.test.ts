import { describe, expect, it } from "vitest";
import {
  MATCH_SCORE_FAQ_ANSWER,
  MATCH_WEIGHTS,
  MATCH_WEIGHTS_HYBRID_LINE,
} from "@/lib/matching-weights-copy";

describe("matching-weights-copy", () => {
  it("weights sum to 100", () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("FAQ and hybrid line use canonical 50/20/15/10/5 split", () => {
    expect(MATCH_WEIGHTS_HYBRID_LINE).toContain("50%");
    expect(MATCH_WEIGHTS_HYBRID_LINE).toContain("20%");
    expect(MATCH_WEIGHTS_HYBRID_LINE).not.toContain("60%");
    expect(MATCH_SCORE_FAQ_ANSWER).toContain("five signals");
    expect(MATCH_SCORE_FAQ_ANSWER).not.toContain("60%");
  });
});
