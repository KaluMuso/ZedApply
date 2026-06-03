import { describe, expect, it } from "vitest";
import {
  formatSkillOverflowSuffix,
  truncateSkillList,
} from "../matchSkillsDisplay";

describe("matchSkillsDisplay", () => {
  it("returns empty visible list for empty input", () => {
    expect(truncateSkillList([], 12)).toEqual({ visible: [], overflowCount: 0 });
  });

  it("returns all skills when under the cap", () => {
    expect(truncateSkillList(["python", "sql"], 12)).toEqual({
      visible: ["python", "sql"],
      overflowCount: 0,
    });
  });

  it("truncates long lists and reports overflow", () => {
    const skills = Array.from({ length: 15 }, (_, i) => `skill-${i + 1}`);
    const result = truncateSkillList(skills, 12);
    expect(result.visible).toHaveLength(12);
    expect(result.visible[0]).toBe("skill-1");
    expect(result.overflowCount).toBe(3);
    expect(formatSkillOverflowSuffix(result.overflowCount)).toBe("+3 more");
  });

  it("formats singular overflow suffix", () => {
    expect(formatSkillOverflowSuffix(1)).toBe("+1 more");
    expect(formatSkillOverflowSuffix(0)).toBeNull();
  });
});
