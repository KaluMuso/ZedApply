import { describe, expect, it } from "vitest";
import {
  formatSkillsLine,
  getDraftSkillsForPreview,
  normalizeSkillList,
} from "../skillsDisplay";

describe("skillsDisplay", () => {
  it("dedupes skills case-insensitively", () => {
    expect(normalizeSkillList(["Excel", "excel", " IFRS "])).toEqual([
      "Excel",
      "IFRS",
    ]);
  });

  it("formats full PDF-style line without cap", () => {
    expect(formatSkillsLine(["Excel", "IFRS"]).line).toBe("Excel · IFRS");
  });

  it("truncates preview with and N more suffix", () => {
    const skills = Array.from({ length: 20 }, (_, i) => `Skill ${i + 1}`);
    const formatted = formatSkillsLine(skills, { maxVisible: 18 });
    expect(formatted.visible).toHaveLength(18);
    expect(formatted.overflowCount).toBe(2);
    expect(formatted.line).toContain("and 2 more");
  });

  it("getDraftSkillsForPreview reads from draft-shaped arrays", () => {
    expect(getDraftSkillsForPreview(["", "SAP", "SAP"])).toEqual(["SAP"]);
  });
});
