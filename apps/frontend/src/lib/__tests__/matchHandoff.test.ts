import { describe, expect, it, beforeEach } from "vitest";
import type { MatchData } from "@/lib/api";
import { readMatchHandoff, stashMatchHandoff, clearMatchHandoff } from "@/lib/matchHandoff";

const MATCH: MatchData = {
  id: "m1",
  score: 72,
  vector_score: 40,
  skill_score: 20,
  bonus_score: 12,
  matched_skills: ["python"],
  missing_skills: ["sql"],
  explanation: "Strong fit",
  job: {
    id: "j1",
    title: "Engineer",
    company: "Acme",
    location: "Lusaka",
    closing_date: null,
    is_active: true,
  },
  created_at: "2026-06-01T00:00:00Z",
};

describe("matchHandoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips a match for the same job id", () => {
    stashMatchHandoff(MATCH);
    expect(readMatchHandoff("j1")?.score).toBe(72);
    expect(readMatchHandoff("j2")).toBeNull();
  });

  it("clears stored handoff", () => {
    stashMatchHandoff(MATCH);
    clearMatchHandoff();
    expect(readMatchHandoff("j1")).toBeNull();
  });
});
