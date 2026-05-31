import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { JobDescription } from "../JobDescription";

describe("JobDescription HTML rendering", () => {
  it("renders description_html in a prose article", () => {
    render(
      <JobDescription
        description={null}
        descriptionHtml="<h2>Responsibilities</h2><ul><li>Lead team</li></ul>"
      />,
    );
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByText("Lead team")).toBeInTheDocument();
  });

  it("renders section_html cards with headings", () => {
    render(
      <JobDescription
        description={null}
        sectionHtml={{
          responsibilities: "<h2>Responsibilities</h2><p>Plan work</p>",
        }}
      />,
    );
    expect(screen.getAllByText(/Responsibilities/).length).toBeGreaterThan(0);
    expect(screen.getByText("Plan work")).toBeInTheDocument();
  });
});
