import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TailoredCvModal } from "../TailoredCvModal";
import { cv as cvApi } from "@/lib/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    cv: {
      ...actual.cv,
      tailorForMatch: vi.fn(),
    },
  };
});

vi.mock("@/lib/trackCvTailoredForMatch", () => ({
  trackCvTailoredForMatch: vi.fn(),
}));

describe("TailoredCvModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cvApi.tailorForMatch).mockResolvedValue({
      generation_id: "gen-1",
      markdown: "# Jane Banda\n\nSUMMARY\nExperienced analyst.",
      word_count: 12,
      job_title: "Analyst",
      company: "ACME",
      cached: false,
    });
  });

  it("calls tailor API when opened and shows markdown", async () => {
    render(
      <TailoredCvModal
        open
        onClose={vi.fn()}
        token="tok"
        matchId="match-1"
        jobId="job-1"
        jobTitle="Analyst"
        company="ACME"
      />,
    );

    await waitFor(() => {
      expect(cvApi.tailorForMatch).toHaveBeenCalledWith("tok", "match-1");
    });

    expect(await screen.findByText(/Experienced analyst/)).toBeInTheDocument();
    expect(screen.getByTestId("tailored-cv-download-md")).toBeInTheDocument();
    expect(screen.getByTestId("tailored-cv-open-builder")).toBeInTheDocument();
  });

  it("navigates to cv-builder with generation id when Open in Builder is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TailoredCvModal
        open
        onClose={onClose}
        token="tok"
        matchId="match-1"
        jobId="job-1"
        jobTitle="Analyst"
        company="ACME"
      />,
    );

    await screen.findByTestId("tailored-cv-open-builder");
    await user.click(screen.getByTestId("tailored-cv-open-builder"));

    expect(onClose).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/profile/cv-builder?"),
    );
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("generationId=gen-1"),
    );
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("matchId=match-1"),
    );
  });
});
