import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtsLivePreview } from "../AtsLivePreview";
import { DEFAULT_DRAFT } from "../store";

describe("AtsLivePreview", () => {
  it("renders draft skills in the Skills section (not collapsed empty)", () => {
    const draft = {
      ...DEFAULT_DRAFT,
      skills: ["IFRS", "Excel", "SAP", "Month-end Close"],
    };

    render(<AtsLivePreview draft={draft} />);

    const skillsSection = screen.getByText("Skills").closest("details");
    expect(skillsSection).toHaveAttribute("open");

    expect(screen.getByText("IFRS")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("SAP")).toBeInTheDocument();

    const printLine = document.querySelector(".cv-skills-line");
    expect(printLine?.textContent).toContain("IFRS");
    expect(printLine?.textContent).toContain("Excel");
    expect(printLine?.textContent).toContain("Month-end Close");
  });

  it("omits Skills section when draft has no skills", () => {
    const draft = { ...DEFAULT_DRAFT, skills: [] };
    render(<AtsLivePreview draft={draft} />);
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });
});
