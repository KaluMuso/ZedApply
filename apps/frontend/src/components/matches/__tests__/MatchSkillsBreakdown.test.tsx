import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchSkillsBreakdown } from "../MatchSkillsBreakdown";

describe("MatchSkillsBreakdown", () => {
  it("renders nothing when both skill lists are empty", () => {
    const { container } = render(
      <MatchSkillsBreakdown matchedSkills={[]} missingSkills={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows only matched section when missing is empty", () => {
    render(
      <MatchSkillsBreakdown matchedSkills={["python", "sql"]} missingSkills={[]} />,
    );
    expect(screen.getByTestId("match-skills-matched")).toBeInTheDocument();
    expect(screen.queryByTestId("match-skills-missing")).not.toBeInTheDocument();
    expect(screen.getByText("python")).toBeInTheDocument();
  });

  it("shows only missing section when matched is empty", () => {
    render(
      <MatchSkillsBreakdown matchedSkills={[]} missingSkills={["kubernetes"]} />,
    );
    expect(screen.queryByTestId("match-skills-matched")).not.toBeInTheDocument();
    expect(screen.getByTestId("match-skills-missing")).toBeInTheDocument();
    expect(screen.getByText("kubernetes")).toBeInTheDocument();
  });

  it("truncates long matched lists with overflow hint", () => {
    const matched = Array.from({ length: 15 }, (_, i) => `skill-${i + 1}`);
    render(
      <MatchSkillsBreakdown
        matchedSkills={matched}
        missingSkills={[]}
        maxMatched={12}
      />,
    );
    expect(screen.getByText("skill-1")).toBeInTheDocument();
    expect(screen.getByText("skill-12")).toBeInTheDocument();
    expect(screen.queryByText("skill-13")).not.toBeInTheDocument();
    expect(screen.getByTestId("match-skills-overflow")).toHaveTextContent("+3 more");
  });

  it("truncates long missing lists independently", () => {
    const missing = Array.from({ length: 8 }, (_, i) => `gap-${i + 1}`);
    render(
      <MatchSkillsBreakdown
        matchedSkills={[]}
        missingSkills={missing}
        maxMissing={5}
      />,
    );
    expect(screen.getAllByTestId("match-skill-missing-chip")).toHaveLength(5);
    expect(screen.getByTestId("match-skills-overflow")).toHaveTextContent("+3 more");
  });
});
