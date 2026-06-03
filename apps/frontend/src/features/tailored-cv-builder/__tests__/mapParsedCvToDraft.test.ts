import { describe, it, expect } from "vitest";
import { parseGeneratedCv } from "@/app/profile/_tabs/generator/parseCv";
import { mapParsedCvToDraft } from "../mapParsedCvToDraft";

describe("mapParsedCvToDraft", () => {
  it("maps header, summary, skills, and experience sections", () => {
    const content = `Jane Banda
+260971234567 · jane@example.com · Lusaka, Zambia

SUMMARY
Finance professional with 5 years in audit.

SKILLS
Excel, IFRS, SAP

EXPERIENCE
Accountant at ACME Zambia
• Prepared monthly management accounts
• Led year-end audit support

EDUCATION
BSc Accounting — UNZA
`;
    const parsed = parseGeneratedCv(content);
    const draft = mapParsedCvToDraft(parsed);

    expect(draft.basics.fullName).toBe("Jane Banda");
    expect(draft.basics.phone).toContain("260");
    expect(draft.basics.summary).toContain("Finance professional");
    expect(draft.skills).toEqual(
      expect.arrayContaining(["Excel", "IFRS", "SAP"]),
    );
    expect(draft.experience.length).toBeGreaterThan(0);
    expect(draft.education.length).toBeGreaterThan(0);
  });

  it("parses newline-separated skills into draft.skills", () => {
    const content = `Patricia Mwale
+260971234567 · patricia@example.com · Lusaka

SKILLS
IFRS
Excel
SAP
Stakeholder Management

EXPERIENCE
Accountant at ACME
• Closed monthly books
`;
    const parsed = parseGeneratedCv(content);
    const draft = mapParsedCvToDraft(parsed);
    expect(draft.skills).toEqual([
      "IFRS",
      "Excel",
      "SAP",
      "Stakeholder Management",
    ]);
  });
});
